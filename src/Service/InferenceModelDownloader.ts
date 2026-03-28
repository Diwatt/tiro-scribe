/**
 * Manages downloading of inference model bundles.
 *
 * Creates and returns `DownloadTaskExecutor` instances; files and versions
 * are stored via `ModelArtifactStorage` and the queue is managed by
 * `DownloadTaskManager`.
 */

import { AppConfig } from '@/Core/AppConfig';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Registry } from '@/Database/Registry';
import type { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import type { InferenceModelFile, ModelConfig } from '../Api';
import { DownloadQueue, DownloadQueueStatus } from '../Entity';
import { InferenceModelConfigProvider } from './InferenceModelConfigProvider';
import { ChecksumVerifier } from './InferenceModelDownload/ChecksumVerifier';
import { DownloadTaskExecutor } from './InferenceModelDownload/DownloadTaskExecutor';
import { DownloadTaskManager } from './InferenceModelDownload/DownloadTaskManager';
import { ModelArtifactStorage } from './InferenceModelDownload/ModelArtifactStorage';
import { DownloadState } from './InferenceModelDownload/Type';

// Re-export types from Type.ts
export type { ModelConfig } from '../Api';

export class InferenceModelDownloader {
    public constructor(
        private readonly logger: AppLogger,
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
     * @param localization optional language code for config lookup
     * @returns the executor handling the download; callers may inspect the
     *          configuration on the executor (`executor.config`) for any
     *          further processing.
     */
    public async download(capability: string, localization?: string): Promise<DownloadTaskExecutor> {
        const config = await this.getConfig(capability, localization);

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
        const queueItem = await this.downloadTaskManager.add(config.capability, localization);
        const executor = this.downloadTaskManager.getOrCreateExecutor(queueItem, config);

        // Kick off the transfer; we deliberately do *not* await the promise so
        // the executor is returned immediately. callers who need to know when
        // the download finishes can still `await executor.start()` themselves.
        // Any rejection will now bubble as an unhandled promise unless the
        // caller attaches their own handler – this is intentional so that
        // client code can react to startup failures rather than having them
        // silently logged here.
        //
        // In Node.js/Jest environments, we add a no-op catch handler to prevent
        // "unhandled promise rejection" errors from being thrown by the event loop,
        // while still allowing callers to handle the rejection themselves.
        executor.start().catch(() => {
            // Rejection is intentional and will be handled by the caller.
            // This catch just prevents Node.js from throwing an unhandled rejection error.
        });

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
        // Return a file URI for the first downloaded artifact, if any.
        const session = this.downloadTaskManager.getActiveSession(capability);
        if (!session) {
            return undefined;
        }

        const file = session.config.files[0];
        if (!file) {
            return undefined;
        }

        let uri = this.artifactStorage.getUri(session.config, file);
        if (!uri.startsWith('file://') && !uri.startsWith('/')) {
            // delegate bruteforce conversion to model storage helper instead of
            // pulling in expo-file-system here (which would break tests).
            uri = this.artifactStorage.toAbsoluteUri(uri);
        }

        return uri;
    }

    /** Path to a specific file in the model configuration. Relative under document dir. */
    public getLocalPathForFile(config: ModelConfig, file: InferenceModelFile): string {
        // When callers ask for a specific file we intend to return a *file URI*
        // pointing at the downloaded artifact.  Historically this method used to
        // hand back a relative path which forced every consumer to run its own
        // resolution logic; per the comment above `resolveModelPath` we still
        // need to guard against that situation when no download session exists.
        let uri = this.artifactStorage.getUri(config, file);

        // Some edge cases (race conditions during cleanup, bugs in the
        // underlying expo-file-system library, or unexpected config
        // mutations) have resulted in the storage layer returning a plain
        // relative path such as "artifacts/foo/model.onnx".  This is a
        // disaster when handed straight to ONNX Runtime, so normalize it here
        // by prefixing the document directory and converting to an actual URI.
        if (!uri.startsWith('file://') && !uri.startsWith('/')) {
            // delegate conversion to storage helper which already knows about
            // expo-file-system; this keeps the downloader free of native
            // module dependencies.
            uri = this.artifactStorage.toAbsoluteUri(uri);
        }

        return uri;
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

    /**
     * Check if a model's files are already downloaded locally.
     * Does NOT trigger a download - use download() for that.
     * @param capability - Model capability (e.g. 'vad', 'asr', 'pitch')
     * @param appLanguage - Optional language for config resolution
     * @returns true if all model files exist locally
     */
    public async isModelDownloaded(capability: string, appLanguage?: string): Promise<boolean> {
        try {
            const config = await this.getConfig(capability, appLanguage);
            return this.artifactStorage.hasAllFiles(config);
        } catch {
            return false;
        }
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

Container.register(InferenceModelDownloader, () => {
    const appConfig = Container.get(AppConfig);
    const logger = Container.get(AppLogger);
    const repository = Container.get(Registry).getRepository<DownloadQueueRepository>(DownloadQueue);

    return new InferenceModelDownloader(
        logger,
        new ModelArtifactStorage(logger, appConfig),
        new DownloadTaskManager(
            logger,
            repository,
            new ChecksumVerifier(),
            new ModelArtifactStorage(logger, appConfig),
        ),
        new InferenceModelConfigProvider(logger),
    );
});
