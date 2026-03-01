/**
 * Manages downloading of inference model bundles.
 *
 * Creates and returns `DownloadTaskExecutor` instances; files and versions
 * are stored via `ModelArtifactStorage` and the queue is managed by
 * `DownloadTaskManager`.
 */

import type { InferenceModelFile, ModelConfig } from '@/Api';
import { DownloadQueueStatus } from '@/Entity/Type';
import { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import { type InferenceModelConfigProvider, inferenceModelConfigProvider } from './InferenceModelConfigProvider';
import { ChecksumVerifier } from './InferenceModelDownload/ChecksumVerifier';
import { DownloadTaskExecutor } from './InferenceModelDownload/DownloadTaskExecutor';
import { DownloadTaskManager } from './InferenceModelDownload/DownloadTaskManager';
import { ModelArtifactStorage } from './InferenceModelDownload/ModelArtifactStorage';
import { DownloadState } from './InferenceModelDownload/Type';
import { appLogger, type LoggerInterface } from './Logger';

// Re-export types from Type.ts
export type { ModelConfig } from '@/Api';

export class InferenceModelDownloader {
    public constructor(
        private readonly logger: LoggerInterface,
        private readonly artifactStorage: ModelArtifactStorage,
        private readonly downloadTaskManager: DownloadTaskManager,
        private readonly configProvider: InferenceModelConfigProvider,
    ) {}

    // Core operations

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
            if (
                item.getStatus() === DownloadQueueStatus.Pending ||
                item.getStatus() === DownloadQueueStatus.Downloading
            ) {
                await this.downloadTaskManager.remove(item.getUuid());
            }
        }
    }

    // Storage management

    /**
     * Download a model bundle for the given capability.
     *
     * If the model already exists locally the existing URI is returned immediately;
     * otherwise the download (with checksum verification) is started in the
     * background while this method returns.  The returned `DownloadTaskExecutor`
     * is already running – callers may subscribe to its `state$`, `progress$` and
     * `error$` streams to follow progress or await `executor.start()` themselves.
     * Progress callbacks should be attached to the executor rather than passed
     * here.
     *
     * This behaviour allows UI layers to receive the executor right away and
     * react to updates without waiting for the transfer to complete.
     *
     * @param capability model capability key (e.g. 'speaker_id')
     * @param appLanguage optional language code for config lookup
     * @returns the executor handling the download; callers may inspect the
     *          configuration on the executor (`executor.config`) for any
     *          further processing.
     */
    public async download(capability: string, appLanguage?: string): Promise<DownloadTaskExecutor> {
        const config = await this.getConfig(capability, appLanguage);

        // Check if all files have been downloaded
        if (this.artifactStorage.hasAllFiles(config)) {
            this.logger.debug(`Model ${config.capability} (${config.id}) already exists`);

            // Return a pre‑completed executor without touching the database or
            // the manager's activeSessions map.  This avoids the previous hack of
            // creating a fake queue item and poking private observables.
            const completedExecutor = DownloadTaskExecutor.createCompleted(
                config.capability,
                config,
                this.logger,
                this.artifactStorage,
                new ChecksumVerifier(),
            );

            return completedExecutor;
        }

        // Add to queue and create session (include language so stored entity is accurate)
        const queueItem = await this.downloadTaskManager.add(config.capability, appLanguage);
        const executor = this.downloadTaskManager.getOrCreateExecutor(queueItem, config);

        // Kick off the transfer; we deliberately do *not* await the promise so
        // the executor is returned immediately. callers who need to know when
        // the download finishes can still `await executor.start()` themselves.
        // Any rejection will now bubble as an unhandled promise unless the
        // caller attaches their own handler – this is intentional so that
        // client code can react to startup failures rather than having them
        // silently logged here.
        executor.start();

        return executor;
    }

    // State queries

    /**
     * Enqueue a download task without performing the actual transfer.
     *
     * This method adds the capability (and optional language) to the queue and
     * triggers the queue processor. It behaves like the former `download`
     * implementation but does _not_ return a URI; callers requesting a path
     * should use `download` instead.
     *
     * @param capability model capability to enqueue
     * @param language optional language filter for config lookup
     */
    public async enqueueDownload(capability: string, language?: string): Promise<void> {
        await this.configProvider.getConfig(capability, language); // validate config exists

        // Add to queue using DownloadTaskManager
        await this.downloadTaskManager.add(capability, language);
        // Process queue using the new integrated queue processing
        await this.downloadTaskManager.processQueue((cap: string, lang2?: string) =>
            this.configProvider.getConfig(cap, lang2),
        );
    }

    public async getConfig(key: string, appLanguage?: string): Promise<ModelConfig> {
        return this.configProvider.getConfig(key, appLanguage);
    }

    // Convenience helpers

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

    // Configuration accessors

    public async getConfigs(appLanguage?: string): Promise<Record<string, ModelConfig>> {
        return this.configProvider.getConfigs(appLanguage);
    }

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

    /**
     * Return the URI of every file associated with the given capability. This
     * is a small convenience that looks up the config and delegates to
     * `ModelArtifactStorage`.
     */
    public async getLocalUris(capability: string, appLanguage?: string): Promise<string[]> {
        const config = await this.getConfig(capability, appLanguage);
        return config.files.map((file) => this.artifactStorage.getUri(config, file));
    }

    /**
     * Return the URI of the "primary" artifact (onnx or first file) for a
     * capability. Useful when the caller just needs a single path and doesn't
     * want to inspect the config.
     */
    public async getPrimaryLocalUri(capability: string, appLanguage?: string): Promise<string> {
        const config = await this.getConfig(capability, appLanguage);
        return this.artifactStorage.getModelUri(config);
    }

    public async getTotalSize(appLanguage?: string): Promise<number> {
        return this.configProvider.getTotalSize(appLanguage);
    }

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
}

// Default downloader instance wired with production dependencies.  Exported so
// callers can simply import `inferenceModelDownloader` instead of constructing
// everything themselves.
const DefaultLogger = appLogger;
const DefaultArtifactStorage = new ModelArtifactStorage(DefaultLogger);
const DefaultChecksumVerifier = new ChecksumVerifier();
const DefaultRepository = new DownloadQueueRepository();
const DefaultDownloadTaskManager = new DownloadTaskManager(
    DefaultLogger,
    DefaultRepository,
    DefaultChecksumVerifier,
    DefaultArtifactStorage,
);

export const inferenceModelDownloader = new InferenceModelDownloader(
    DefaultLogger,
    DefaultArtifactStorage,
    DefaultDownloadTaskManager,
    inferenceModelConfigProvider,
);
