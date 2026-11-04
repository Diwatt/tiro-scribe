/**
 * DownloadTaskManager – Tracks active download sessions.
 * Persists queue entries via DownloadQueueRepository and caches one executor
 * per capability while its download runs.
 */

import type { ModelConfig } from '@/Api';
import type { AppLogger } from '@/Core/AppLogger';
import { DownloadQueue } from '@/Entity/DownloadQueue';
import { DownloadQueueStatus } from '@/Entity/Type';
import { InferenceModelDownloaderException } from '@/Exception';
import type { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import type { ChecksumVerifier } from './ChecksumVerifier';
import { DownloadTaskExecutor } from './DownloadTaskExecutor';
import type { ModelArtifactStorage } from './ModelArtifactStorage';

export class DownloadTaskManager {
    private readonly activeSessions: Map<string, DownloadTaskExecutor> = new Map();

    public constructor(
        private readonly logger: AppLogger,
        private readonly repository: DownloadQueueRepository,
        private readonly checksumVerifier: ChecksumVerifier,
        private readonly artifactStorage: ModelArtifactStorage,
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

    public getActiveSession(capability: string): DownloadTaskExecutor | undefined {
        return this.activeSessions.get(capability);
    }

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
}
