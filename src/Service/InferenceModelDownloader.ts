/**
 * InferenceModelDownloader – Orchestrator for the complete lifecycle of inference model bundles.
 *
 * Responsibilities:
 * 1. Download model bundles with progress tracking and checksum verification
 * 2. Manage model versions (detect updates, replace old versions)
 * 3. Handle storage organization and cleanup of old versions
 * 4. Provide queue management for concurrent downloads with priorities (using database)
 * 5. Offer connectivity resilience (automatic pause/resume)
 *
 * This class does NOT:
 * - Load models into memory (InferenceManager's responsibility)
 * - Decide which models to download (business logic responsibility)
 * - Execute inference (InferenceManager's responsibility)
 *
 * Architecture follows SOLID principles with clear separation of concerns.
 * Queue management is delegated to DownloadQueue for persistence and observable state.
 */

import type { InferenceModelFile, ModelConfig } from '@/Api';
import { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import { InferenceModelConfigProvider } from './InferenceModelConfigProvider';
import { ChecksumVerifier } from './InferenceModelDownload/ChecksumVerifier';
import { DownloadTaskManager } from './InferenceModelDownload/DownloadTaskManager';
import { FileDownloader } from './InferenceModelDownload/FileDownloader';
import { ModelArtifactStorage } from './InferenceModelDownload/ModelArtifactStorage';
import type { ProgressCallback } from './InferenceModelDownload/Type';
import { DownloadState } from './InferenceModelDownload/Type';
import { AppLogger, type LoggerInterface } from './Logger';

// Re-export types from Type.ts
export type { ModelConfig } from '@/Api';
export type { ProgressCallback } from './InferenceModelDownload/Type';

export class InferenceModelDownloader {
    private static instance: InferenceModelDownloader | null = null;

    public constructor(
        private readonly logger: LoggerInterface,
        private readonly artifactStorage: ModelArtifactStorage,
        private readonly downloadTaskManager: DownloadTaskManager,
        private readonly configProvider: InferenceModelConfigProvider,
    ) {
        // All dependencies are automatically assigned via parameter properties
    }

    public static getInstance(): InferenceModelDownloader {
        if (InferenceModelDownloader.instance == null) {
            InferenceModelDownloader.instance = InferenceModelDownloader.createDefaultInstance();
        }

        return InferenceModelDownloader.instance;
    }

    private static createDefaultInstance(): InferenceModelDownloader {
        const logger = AppLogger.getInstance();
        const artifactStorage = new ModelArtifactStorage(logger);
        const checksumVerifier = new ChecksumVerifier();
        const fileDownloader = new FileDownloader(logger);
        const configProvider = InferenceModelConfigProvider.getInstance();
        const repository = new DownloadQueueRepository();
        const downloadTaskManager = new DownloadTaskManager(logger, repository, fileDownloader, checksumVerifier, artifactStorage);

        return new InferenceModelDownloader(logger, artifactStorage, downloadTaskManager, configProvider);
    }

    // ==================== Core Download Operations ====================

    public async download(capability: string, language?: string): Promise<void> {
        await this.configProvider.getConfig(capability, language); // validate config exists

        // Add to queue using DownloadTaskManager
        await this.downloadTaskManager.add(capability, language);
        // Process queue using the new integrated queue processing
        await this.downloadTaskManager.processQueue((cap: string, lang?: string) => this.configProvider.getConfig(cap, lang));
    }

    // ==================== Storage Management ====================

    public async delete(capability: string, version?: string): Promise<void> {
        const config = await this.getConfig(capability);

        if (version && config.version !== version) {
            // In a full implementation, we would have version-specific storage
            this.logger.warn(`Version ${version} not found for ${capability}, deleting all versions`);
        }

        await this.artifactStorage.deleteModelConfig(config);
        // Remove from active sessions
        const session = this.downloadTaskManager.getActiveSession(capability);
        if (session) {
            this.downloadTaskManager.removeSession(session.capability);
        }

        // Remove from database queue if pending
        const queueItems = await this.downloadTaskManager.getByCapability(capability);
        for (const item of queueItems) {
            if (item.status === DownloadState.Pending || item.status === DownloadState.Downloading) {
                await this.downloadTaskManager.remove(item.id);
            }
        }
    }

    // ==================== State Queries ====================

    public getLocalPath(capability: string, _version?: string): string | undefined {
        // In a full implementation, this would resolve the actual file path
        // For now, we use the existing method
        const session = this.downloadTaskManager.getActiveSession(capability);
        if (!session) {
            return undefined;
        }

        // Return path to first file (simplified)
        const file = session.config.files[0];
        if (!file) {
            return undefined;
        }

        return this.artifactStorage.resolvePath(session.config, file);
    }

    /** Path to a specific file in the model configuration. Relative under document dir. */
    public getLocalPathForFile(config: ModelConfig, file: InferenceModelFile): string {
        return this.artifactStorage.resolvePath(config, file);
    }

    // ==================== Convenience Methods ====================

    public async ensureDownloaded(capability: string, onProgress?: ProgressCallback, appLanguage?: string): Promise<string> {
        const config = await this.getConfig(capability, appLanguage);
        return this.ensureDownloadedWithConfig(config, onProgress);
    }

    // ==================== Configuration Methods ====================

    public async getConfig(key: string, appLanguage?: string): Promise<ModelConfig> {
        return this.configProvider.getConfig(key, appLanguage);
    }

    public async getConfigs(appLanguage?: string): Promise<Record<string, ModelConfig>> {
        return this.configProvider.getConfigs(appLanguage);
    }

    public async getTotalSize(appLanguage?: string): Promise<number> {
        return this.configProvider.getTotalSize(appLanguage);
    }

    public async getConfigByLocalPath(localPath: string): Promise<ModelConfig | undefined> {
        // Get all local configs
        const localConfigs = await this.getLocalConfigs();

        // Search through all configs to find one that matches the path
        for (const config of Object.values(localConfigs)) {
            // Check if any file in this config matches the local path
            for (const file of config.files) {
                const filePath = this.artifactStorage.resolvePath(config, file);
                if (filePath === localPath || filePath.endsWith(localPath)) {
                    return config;
                }
            }
        }

        return undefined;
    }

    public removeSession(capability: string): void {
        this.downloadTaskManager.removeSession(capability);
    }

    public clearSessions(): void {
        this.downloadTaskManager.clearSessions();
    }

    // ==================== Private Methods ====================

    private async getLocalConfigs(): Promise<Record<string, ModelConfig>> {
        // Scan file system for downloaded models via ModelArtifactStorage
        // This is a simplified implementation - in reality we would need to scan the artifact directory
        const sessions = this.downloadTaskManager.getActiveSessions();
        const configs: Record<string, ModelConfig> = {};

        for (const session of sessions) {
            if (session.getState() === DownloadState.Completed) {
                configs[session.capability] = session.config;
            }
        }

        // Additionally, we could scan the file system for models that aren't tracked by sessions
        // For now, we rely on sessions only
        return configs;
    }

    private async ensureDownloadedWithConfig(config: ModelConfig, onProgress?: ProgressCallback): Promise<string> {
        // Check if all files have been downloaded
        if (this.artifactStorage.hasAllFiles(config)) {
            const uri = this.artifactStorage.getModelUri(config);
            this.logger.debug(`Model ${config.capability} (${config.id}) already exists at ${uri}`);
            return uri;
        }

        // Add to queue and wait for completion
        const queueItem = await this.downloadTaskManager.add(config.capability, undefined);
        const session = this.downloadTaskManager.createSession(queueItem, config);

        // Start download
        await session.start();

        // Wait for completion (session.start() already updates queue)
        while (session.getState() === DownloadState.Downloading || session.getState() === DownloadState.Pending) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            if (onProgress) {
                onProgress(session.getProgress());
            }
        }

        if (session.getState() === DownloadState.Completed) {
            return this.artifactStorage.getModelUri(config);
        } else {
            throw session.getError() || new Error('Download failed');
        }
    }
}
