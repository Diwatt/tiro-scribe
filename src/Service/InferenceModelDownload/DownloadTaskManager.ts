/**
 * DownloadTaskManager – Unified queue management for download tasks.
 * Uses DownloadQueueRepository for persistence.
 * Executors provide observable state for active downloads.
 */

import dayjs from 'dayjs';
import type { ModelConfig } from '@/Api';
import type { AppLogger } from '@/Core/AppLogger';
import { Criteria } from '@/Database/Criteria';
import { DownloadQueue } from '@/Entity/DownloadQueue';
import { DownloadQueueStatus } from '@/Entity/Type';
import { InferenceModelDownloaderException } from '@/Exception';
import type { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import type { ChecksumVerifier } from './ChecksumVerifier';
import { DownloadTaskExecutor } from './DownloadTaskExecutor';
import type { ModelArtifactStorage } from './ModelArtifactStorage';
import type { QueueStats } from './Type';

export class DownloadTaskManager {
    private readonly activeSessions: Map<string, DownloadTaskExecutor> = new Map();
    private isPaused = false;

    public constructor(
        private readonly logger: AppLogger,
        private readonly repository: DownloadQueueRepository,
        private readonly checksumVerifier: ChecksumVerifier,
        private readonly artifactStorage: ModelArtifactStorage,
        private maxConcurrentDownloads = 2,
    ) {}

    /**
     * Add a new download task to the queue.
     */
    public async add(capability: string, language?: string, maxRetries = 3): Promise<DownloadQueue> {
        try {
            // Validate inputs
            if (!capability || capability.trim() === '') {
                throw new InferenceModelDownloaderException('Capability is required');
            }

            if (language?.trim() === '') {
                throw new InferenceModelDownloaderException('Language cannot be empty string');
            }

            // Create DownloadQueue entity with minimal required properties
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

            // Save to database
            await this.repository.persist(downloadEntity);

            this.logger.debug(`Added download task to queue: ${downloadEntity.getUuid()} for ${capability}`);
            return downloadEntity;
        } catch (error) {
            this.logger.error(`Failed to add download task to queue: ${capability}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to add download task for capability: ${capability}`,
                error instanceof Error ? error : undefined,
            );
        }
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
            this.activeSessions.clear();
            this.logger.debug('Cleared all download tasks');
        } catch (error) {
            this.logger.error('Failed to clear all download tasks', error);
            throw new InferenceModelDownloaderException(
                'Failed to clear all download tasks',
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Clear all active download sessions.
     */
    public clearSessions(): void {
        this.activeSessions.clear();
        this.logger.debug('Cleared all active download sessions');
    }

    /**
     * Find download tasks by status.
     */
    public async findByStatus(status: DownloadQueueStatus): Promise<DownloadQueue[]> {
        try {
            const entities = await this.repository.findByStatus(status);
            return entities.toArray();
        } catch (error) {
            this.logger.error(`Failed to get download tasks with status ${status}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to get download tasks with status ${status}`,
                error instanceof Error ? error : undefined,
            );
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
            throw new InferenceModelDownloaderException(
                'Failed to find oldest pending task',
                error instanceof Error ? error : undefined,
            );
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
            throw new InferenceModelDownloaderException(
                'Failed to find processable tasks',
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Get active download session for a capability.
     */
    public getActiveSession(capability: string): DownloadTaskExecutor | undefined {
        return this.activeSessions.get(capability);
    }

    /**
     * Get all active download sessions.
     */
    public getActiveSessions(): DownloadTaskExecutor[] {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Get all download tasks.
     */
    public async getAll(): Promise<DownloadQueue[]> {
        try {
            const entities = await this.repository.findAll();
            return entities.toArray();
        } catch (error) {
            this.logger.error('Failed to get all download tasks', error);
            throw new InferenceModelDownloaderException(
                'Failed to get all download tasks',
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Get download tasks by capability.
     */
    public async getByCapability(capability: string): Promise<DownloadQueue[]> {
        try {
            const entities = await this.repository.findByCapability(capability);
            return entities.toArray();
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
    public async getByCapabilityAndLanguage(capability: string, language: string): Promise<DownloadQueue[]> {
        try {
            const entities = await this.repository.findByCapabilityAndLanguage(capability, language);
            return entities.toArray();
        } catch (error) {
            this.logger.error(`Failed to get download tasks for ${capability}/${language}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to get download tasks for ${capability}/${language}`,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Get download task by UUID.
     */
    public async getById(uuid: string): Promise<DownloadQueue | null> {
        try {
            const criteria = Criteria.of({ uuid });
            const entityCollection = await this.repository.findBy(criteria);
            const entity = entityCollection.first();
            return entity ?? null;
        } catch (error) {
            this.logger.error(`Failed to get download task by UUID ${uuid}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to get download task by UUID ${uuid}`,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Get an existing download session for a queued task or create a new one.
     * The method does **not** persist anything to the database; it merely
     * returns a `DownloadTaskExecutor` instance while ensuring there is at most
     * one executor per capability in `activeSessions`.
     *
     * This replaces the older `createSession` name to make the behaviour more
     * explicit (it may return an existing session).
     *
     * @param queueEntity - The DownloadQueue entity from the database
     * @param config - Model configuration for the download
     */
    public getOrCreateExecutor(queueEntity: DownloadQueue, config: ModelConfig): DownloadTaskExecutor {
        // If an executor already exists for this capability, return it
        const existing = this.activeSessions.get(queueEntity.capability);
        if (existing) {
            this.logger.debug(`Executor already exists for capability ${queueEntity.capability}`);
            return existing;
        }

        // Otherwise create and cache a new executor
        const executor = new DownloadTaskExecutor(
            this.logger,
            queueEntity,
            config,
            this.checksumVerifier,
            this.artifactStorage,
        );
        this.activeSessions.set(queueEntity.capability, executor);
        this.logger.debug(`Created download executor for capability ${queueEntity.capability}`);
        return executor;
    }

    /**
     * Get queue statistics.
     */
    public async getStats(): Promise<QueueStats> {
        try {
            return await this.repository.getStats();
        } catch (error) {
            this.logger.error('Failed to get queue statistics', error);
            throw new InferenceModelDownloaderException(
                'Failed to get queue statistics',
                error instanceof Error ? error : undefined,
            );
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
            throw new InferenceModelDownloaderException(
                `Failed to increment retry count of download task ${uuid}`,
                error instanceof Error ? error : undefined,
            );
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
     * Process the download queue.
     */
    public async processQueue(
        getConfig: (capability: string, language?: string) => Promise<ModelConfig>,
    ): Promise<void> {
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

                // Create download session with plain entity
                const config = await getConfig(capability, language);
                const session = new DownloadTaskExecutor(
                    this.logger,
                    task,
                    config,
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
            throw new InferenceModelDownloaderException(
                'Failed to process download queue',
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
            this.logger.debug(`Removed download task ${uuid} from queue`);
        } catch (error) {
            this.logger.error(`Failed to remove download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to remove download task ${uuid}`,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Remove active session.
     */
    public removeSession(capability: string): void {
        this.activeSessions.delete(capability);
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

            this.logger.debug(`Updated error of download task ${uuid}: ${errorMessage}`);
        } catch (error) {
            this.logger.error(`Failed to update error of download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to update error of download task ${uuid}`,
                error instanceof Error ? error : undefined,
            );
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

            this.logger.debug(`Updated progress of download task ${uuid} to ${progressPercent}%`);
        } catch (error) {
            this.logger.error(`Failed to update progress of download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to update progress of download task ${uuid}`,
                error instanceof Error ? error : undefined,
            );
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

            this.logger.debug(`Updated status of download task ${uuid} to ${status}`);
        } catch (error) {
            this.logger.error(`Failed to update status of download task ${uuid}`, error);
            throw new InferenceModelDownloaderException(
                `Failed to update status of download task ${uuid}`,
                error instanceof Error ? error : undefined,
            );
        }
    }
}
