/**
 * DownloadTaskManager – Unified queue management for download tasks.
 * Uses DownloadQueueRepository for persistence and observable state for UI.
 * Provides observable state for UI.
 */

import { type Observable } from '@legendapp/state';
import dayjs from 'dayjs';
import type { ModelConfig } from '@/Api';
import { DownloadQueue } from '@/Entity/DownloadQueue';
import { DownloadQueueStatus } from '@/Entity/Type';
import { InferenceModelDownloaderException } from '@/Exception/InferenceModelDownloaderException';
import { Criteria } from '@/Database/Criteria';
import { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import type { LoggerInterface } from '@/Service/Logger';
import { AppLogger } from '@/Service/Logger';
import type { ChecksumVerifier } from './ChecksumVerifier';
import { DownloadSession } from './DownloadSession';
import type { FileDownloader } from './FileDownloader';
import type { ModelArtifactStorage } from './ModelArtifactStorage';
import type { QueueStats } from './Type';
import { DownloadState } from './Type';

/**
 * Observable download task state for real‑time updates.
 * Combines plain properties with Legend State observables.
 * This type is exported for use by DownloadSession.
 */
export type ObservableDownloadTask = {
    readonly id: string;
    readonly capability: string;
    readonly language?: string;
    readonly nbRetries: number;
    readonly maxRetries: number;
    readonly status: DownloadState;
    readonly progress: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    // Observable properties
    readonly state$: Observable<DownloadState>;
    readonly progress$: Observable<number>;
    readonly error$: Observable<string | undefined>;
};

export class DownloadTaskManager {
    // Private properties
    private readonly logger: LoggerInterface;
    private readonly repository: DownloadQueueRepository;
    private readonly fileDownloader: FileDownloader;
    private readonly checksumVerifier: ChecksumVerifier;
    private readonly artifactStorage: ModelArtifactStorage;
    private readonly observableItems: Map<string, ObservableDownloadTask> = new Map();
    private readonly activeSessions: Map<string, DownloadSession> = new Map();
    private maxConcurrentDownloads: number = 2;
    private isPaused: boolean = false;

    public constructor(
        logger: LoggerInterface = AppLogger.getInstance(),
        repository: DownloadQueueRepository = new DownloadQueueRepository(),
        fileDownloader: FileDownloader,
        checksumVerifier: ChecksumVerifier,
        artifactStorage: ModelArtifactStorage,
        maxConcurrentDownloads: number = 2,
    ) {
        this.logger = logger;
        this.repository = repository;
        this.fileDownloader = fileDownloader;
        this.checksumVerifier = checksumVerifier;
        this.artifactStorage = artifactStorage;
        this.maxConcurrentDownloads = maxConcurrentDownloads;
    }

    /**
     * Get or create an observable task from an entity with caching support.
     * Uses the manager's internal cache (this.observableItems).
     */
    private getOrCreateObservableTask(entity: DownloadQueue, maxRetries?: number): ObservableDownloadTask {
        const existing = this.observableItems.get(entity.getUuid());
        if (existing) {
            return existing;
        }

        // Create observable object using entity's toObservable method
        const observableObj = entity.toObservable<Record<string, unknown>>();

        // Dates should be set by ORM defaults - throw if they're not
        if (!entity.createdAt) {
            throw new InferenceModelDownloaderException(`DownloadQueue entity ${entity.getUuid()} has no createdAt date - ORM defaults not applied`);
        }
        if (!entity.updatedAt) {
            throw new InferenceModelDownloaderException(`DownloadQueue entity ${entity.getUuid()} has no updatedAt date - ORM defaults not applied`);
        }

        // Build ObservableDownloadTask shape
        const observableTask: ObservableDownloadTask = {
            id: entity.uuid,
            capability: entity.capability,
            language: entity.language || undefined,
            nbRetries: entity.nbRetries,
            maxRetries: maxRetries ?? entity.maxRetries,
            status: entity.status as unknown as DownloadState,
            progress: entity.progressPercent,
            createdAt: entity.createdAt.toDate(),
            updatedAt: entity.updatedAt.toDate(),
            state$: observableObj.status$ as Observable<DownloadState>,
            progress$: observableObj.progressPercent$ as Observable<number>,
            // Convert string error message to Error object for compatibility
            error$: observableObj.errorMessage$ as Observable<string | undefined>,
        };

        this.observableItems.set(entity.getUuid(), observableTask);
        return observableTask;
    }

    /**
     * Add a new download task to the queue.
     */
    public async add(capability: string, language?: string, maxRetries: number = 3): Promise<ObservableDownloadTask> {
        try {
            // Validate inputs
            if (!capability || capability.trim() === '') {
                throw new InferenceModelDownloaderException('Capability is required');
            }

            if (language && language.trim() === '') {
                throw new InferenceModelDownloaderException('Language cannot be empty string');
            }

            // Create DownloadQueue entity with minimal required properties
            // Let the ORM/decorator system handle defaults (UUID, createdAt, updatedAt, etc.)
            const downloadEntity = new DownloadQueue({
                capability,
                language: language || '',
                maxRetries,
                status: DownloadQueueStatus.Pending,
                progressPercent: 0,
                nbRetries: 0,
                filePath: '',
                errorMessage: '',
                metadata: {},
            });

            // Save to database - the ORM should apply default values
            await this.repository.persist(downloadEntity);

            // Verify UUID was generated by the ORM
            const entityUuid = downloadEntity.getUuid();
            if (!entityUuid || entityUuid.trim() === '') {
                this.logger.warn(`UUID not generated by ORM for capability: ${capability}`);
                // Don't call setUuid() - this indicates a deeper ORM issue
            }

            // Create observable item using manager's method
            const observableItem = this.getOrCreateObservableTask(downloadEntity, maxRetries);

            this.logger.debug(`Added download task to queue: ${entityUuid} for ${capability}`);
            return observableItem;
        } catch (error) {
            this.logger.error(`Failed to add download task to queue: ${capability}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to add download task for capability: ${capability}`,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Find download tasks by status.
     */
    public async findByStatus(status: DownloadQueueStatus): Promise<ObservableDownloadTask[]> {
        try {
            const entities = await this.repository.findByStatus(status);
            return entities.toArray().map((entity) => this.getOrCreateObservableTask(entity));
        } catch (error) {
            this.logger.error(`Failed to get download tasks with status ${status}`, error);
            throw new InferenceModelDownloaderException(`Failed to get download tasks with status ${status}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Get download task by UUID.
     */
    public async getById(uuid: string): Promise<ObservableDownloadTask | null> {
        try {
            // Check cache first
            const cached = this.observableItems.get(uuid);
            if (cached) {
                return cached;
            }

            // Fetch from database - use Criteria.of to create proper criteria
            const criteria = Criteria.of({ uuid });
            const entityCollection = await this.repository.findBy(criteria);
            const entity = entityCollection.first();
            if (entity == null) {
                return null;
            }

            return this.getOrCreateObservableTask(entity);
        } catch (error) {
            this.logger.error(`Failed to get download task by UUID ${uuid}`, error);
            throw new InferenceModelDownloaderException(`Failed to get download task by UUID ${uuid}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Get all download tasks (observable).
     */
    public async getAll(): Promise<ObservableDownloadTask[]> {
        try {
            const entities = await this.repository.findAll();
            return entities.toArray().map((entity) => this.getOrCreateObservableTask(entity));
        } catch (error) {
            this.logger.error('Failed to get all download tasks', error);
            throw new InferenceModelDownloaderException('Failed to get all download tasks', error instanceof Error ? error : undefined);
        }
    }

    /**
     * Get download tasks by capability.
     */
    public async getByCapability(capability: string): Promise<ObservableDownloadTask[]> {
        try {
            const entities = await this.repository.findByCapability(capability);
            return entities.toArray().map((entity) => this.getOrCreateObservableTask(entity));
        } catch (error) {
            this.logger.error(`Failed to get download tasks for capability ${capability}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to get download tasks for capability ${capability}`,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Get download tasks by capability and language.
     */
    public async getByCapabilityAndLanguage(capability: string, language: string): Promise<ObservableDownloadTask[]> {
        try {
            const entities = await this.repository.findByCapabilityAndLanguage(capability, language);
            return entities.toArray().map((entity) => this.getOrCreateObservableTask(entity));
        } catch (error) {
            this.logger.error(`Failed to get download tasks for ${capability}/${language}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to get download tasks for ${capability}/${language}`,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Remove a download task from the queue.
     */
    public async remove(uuid: string): Promise<void> {
        try {
            const criteria = Criteria.of({ uuid });
            const entityCollection = await this.repository.findBy(criteria);
            const entity = entityCollection.first();
            if (entity) {
                await this.repository.remove(entity);
            }
            this.observableItems.delete(uuid);
            this.logger.debug(`Removed download task ${uuid} from queue`);
        } catch (error) {
            this.logger.error(`Failed to remove download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(`Failed to remove download task ${uuid}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Update task status.
     */
    public async updateStatus(uuid: string, status: DownloadQueueStatus): Promise<void> {
        try {
            const criteria = Criteria.of({ uuid });
            const entityCollection = await this.repository.findBy(criteria);
            const entity = entityCollection.first();
            if (entity == null) {
                throw new InferenceModelDownloaderException(`Download task ${uuid} not found`);
            }

            entity.setStatus(status);
            entity.setUpdatedAt(dayjs());
            await this.repository.persist(entity);

            // Update cached observable if exists
            const cached = this.observableItems.get(uuid);
            if (cached) {
                // Observable state will be updated via entity's observable properties
                this.logger.debug(`Updated status of download task ${uuid} to ${status}`);
            }
        } catch (error) {
            this.logger.error(`Failed to update status of download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(`Failed to update status of download task ${uuid}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Update task progress.
     */
    public async updateProgress(uuid: string, progressPercent: number): Promise<void> {
        try {
            const criteria = Criteria.of({ uuid });
            const entityCollection = await this.repository.findBy(criteria);
            const entity = entityCollection.first();
            if (entity == null) {
                throw new InferenceModelDownloaderException(`Download task ${uuid} not found`);
            }

            entity.setProgressPercent(progressPercent);
            entity.setUpdatedAt(dayjs());
            await this.repository.persist(entity);

            // Update cached observable if exists
            const cached = this.observableItems.get(uuid);
            if (cached) {
                // Observable state will be updated via entity's observable properties
                this.logger.debug(`Updated progress of download task ${uuid} to ${progressPercent}%`);
            }
        } catch (error) {
            this.logger.error(`Failed to update progress of download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(`Failed to update progress of download task ${uuid}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Update task error message.
     */
    public async updateError(uuid: string, errorMessage: string): Promise<void> {
        try {
            const criteria = Criteria.of({ uuid });
            const entityCollection = await this.repository.findBy(criteria);
            const entity = entityCollection.first();
            if (entity == null) {
                throw new InferenceModelDownloaderException(`Download task ${uuid} not found`);
            }

            entity.setErrorMessage(errorMessage);
            entity.setUpdatedAt(dayjs());
            await this.repository.persist(entity);

            // Update cached observable if exists
            const cached = this.observableItems.get(uuid);
            if (cached) {
                // Observable state will be updated via entity's observable properties
                this.logger.debug(`Updated error of download task ${uuid}: ${errorMessage}`);
            }
        } catch (error) {
            this.logger.error(`Failed to update error of download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(`Failed to update error of download task ${uuid}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Increment retry count for a task.
     */
    public async incrementRetryCount(uuid: string): Promise<void> {
        try {
            const criteria = Criteria.of({ uuid });
            const entityCollection = await this.repository.findBy(criteria);
            const entity = entityCollection.first();
            if (entity == null) {
                throw new InferenceModelDownloaderException(`Download task ${uuid} not found`);
            }

            const newCount = entity.getNbRetries() + 1;
            entity.setNbRetries(newCount);
            entity.setUpdatedAt(dayjs());
            await this.repository.persist(entity);

            this.logger.debug(`Incremented retry count of download task ${uuid} to ${newCount}`);
        } catch (error) {
            this.logger.error(`Failed to increment retry count of download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(`Failed to increment retry count of download task ${uuid}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Get queue statistics.
     */
    public async getStats(): Promise<QueueStats> {
        try {
            return await this.repository.getStats();
        } catch (error) {
            this.logger.error('Failed to get queue statistics', error);
            throw new InferenceModelDownloaderException('Failed to get queue statistics', error instanceof Error ? error : undefined);
        }
    }

    /**
     * Find processable tasks (pending or failed with retries left).
     */
    public async findProcessable(): Promise<DownloadQueue[]> {
        try {
            return await this.repository.findProcessable();
        } catch (error) {
            this.logger.error('Failed to find processable tasks', error);
            throw new InferenceModelDownloaderException('Failed to find processable tasks', error instanceof Error ? error : undefined);
        }
    }

    /**
     * Find the oldest pending download task.
     */
    public async findOldestPending(): Promise<DownloadQueue | null> {
        try {
            return await this.repository.findOldestPending();
        } catch (error) {
            this.logger.error('Failed to find oldest pending task', error);
            throw new InferenceModelDownloaderException('Failed to find oldest pending task', error instanceof Error ? error : undefined);
        }
    }

    /**
     * Get active download session for a capability.
     */
    public getActiveSession(capability: string): DownloadSession | undefined {
        return this.activeSessions.get(capability);
    }

    /**
     * Remove active session.
     */
    public removeSession(capability: string): void {
        this.activeSessions.delete(capability);
    }

    /**
     * Process the download queue.
     */
    public async processQueue(getConfig: (capability: string, language?: string) => Promise<ModelConfig>): Promise<void> {
        if (this.isPaused) {
            this.logger.debug('Queue processing is paused');
            return;
        }

        try {
            const processable = await this.findProcessable();
            if (processable.length === 0) {
                this.logger.debug('No processable tasks in queue');
                return;
            }

            // Sort by createdAt (oldest first)
            const sorted = processable.sort((a, b) => a.getCreatedAt().diff(b.getCreatedAt()));
            const toProcess = sorted.slice(0, this.maxConcurrentDownloads);

            this.logger.debug(`Processing ${toProcess.length} download tasks`);

            for (const task of toProcess) {
                const capability = task.getCapability();
                const language = task.getLanguage();

                // Skip if already has an active session
                if (this.activeSessions.has(capability)) {
                    this.logger.debug(`Skipping ${capability}: already has active session`);
                    continue;
                }

                // Update status to downloading
                await this.updateStatus(task.getUuid(), DownloadQueueStatus.Downloading);

                // Create download session - convert DownloadQueue to ObservableDownloadTask first
                const observableTask = this.getOrCreateObservableTask(task);
                const config = await getConfig(capability, language);
                const session = new DownloadSession(
                    this.logger,
                    observableTask,
                    config,
                    this.fileDownloader,
                    this.checksumVerifier,
                    this.artifactStorage,
                    (progress: number) => this.updateProgress(task.getUuid(), progress),
                    async (error: Error) => {
                        await this.updateError(task.getUuid(), error.message);
                        await this.updateStatus(task.getUuid(), DownloadQueueStatus.Failed);
                        this.activeSessions.delete(capability);
                    },
                    async () => {
                        await this.updateStatus(task.getUuid(), DownloadQueueStatus.Completed);
                        this.activeSessions.delete(capability);
                    },
                );

                this.activeSessions.set(capability, session);
                session.start().catch((error) => {
                    this.logger.error(`Download session for ${capability} failed`, error);
                    this.activeSessions.delete(capability);
                });
            }
        } catch (error) {
            this.logger.error('Failed to process download queue', error);
            throw new InferenceModelDownloaderException('Failed to process download queue', error instanceof Error ? error : undefined);
        }
    }

    /**
     * Pause queue processing.
     */
    public pause(): void {
        this.isPaused = true;
        this.logger.debug('Queue processing paused');
    }

    /**
     * Resume queue processing.
     */
    public resume(): void {
        this.isPaused = false;
        this.logger.debug('Queue processing resumed');
        // Note: Caller should trigger processQueue after resume
    }

    /**
     * Set maximum concurrent downloads.
     */
    public setMaxConcurrentDownloads(max: number): void {
        if (max < 1) {
            throw new InferenceModelDownloaderException('Maximum concurrent downloads must be at least 1');
        }
        this.maxConcurrentDownloads = max;
        this.logger.debug(`Maximum concurrent downloads set to ${max}`);
    }

    /**
     * Clear all active download sessions.
     */
    public clearSessions(): void {
        this.activeSessions.clear();
        this.logger.debug('Cleared all active download sessions');
    }

    /**
     * Get all active download sessions.
     */
    public getActiveSessions(): DownloadSession[] {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Create a download session for a queued task.
     * @param queueItem - The observable download task from the queue
     * @param config - Model configuration for the download
     */
    public createSession(queueItem: ObservableDownloadTask, config: ModelConfig): DownloadSession {
        // Check if a session already exists for this capability
        const existingSession = this.activeSessions.get(queueItem.capability);
        if (existingSession) {
            this.logger.debug(`Session already exists for capability ${queueItem.capability}`);
            return existingSession;
        }

        // Create new session
        const session = new DownloadSession(this.logger, queueItem, config, this.fileDownloader, this.checksumVerifier, this.artifactStorage);

        // Store in active sessions map
        this.activeSessions.set(queueItem.capability, session);
        this.logger.debug(`Created download session for capability ${queueItem.capability}`);

        return session;
    }

    /**
     * Clear all download tasks (for testing/reset).
     */
    public async clearAll(): Promise<void> {
        try {
            const all = await this.repository.findAll();
            for (const item of all.toArray()) {
                await this.repository.remove(item);
            }
            this.observableItems.clear();
            this.activeSessions.clear();
            this.logger.debug('Cleared all download tasks');
        } catch (error) {
            this.logger.error('Failed to clear all download tasks', error);
            throw new InferenceModelDownloaderException('Failed to clear all download tasks', error instanceof Error ? error : undefined);
        }
    }
}
