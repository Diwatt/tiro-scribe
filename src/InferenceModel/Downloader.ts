import { AppConfig } from '@/Core/AppConfig';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Database } from '@/Database/Database';
import type { ModelConfig } from '../Api';
import { DownloadQueue } from '../Entity';
import { ConfigProvider } from './ConfigProvider';
import { ChecksumVerifier } from './Download/ChecksumVerifier';
import { DownloadTaskExecutor } from './Download/DownloadTaskExecutor';
import { DownloadTaskManager } from './Download/DownloadTaskManager';
import type { InferenceModelFileRole } from './Download/ModelArtifactStorage';
import { ModelArtifactStorage } from './Download/ModelArtifactStorage';
import { DownloadState } from './Download/Type';
import { InferenceModelDownloaderException } from '@/Exception';

// Re-export types from Api
export type { ModelConfig } from '../Api';

export class Downloader {
    public constructor(
        private readonly logger: AppLogger,
        private readonly artifactStorage: ModelArtifactStorage,
        private readonly downloadTaskManager: DownloadTaskManager,
        private readonly configProvider: ConfigProvider,
    ) {}

    /**
     * Download a model bundle for the given capability.
     *
     * If the model already exists locally the existing URI is returned immediately;
     * otherwise the download (with checksum verification) is started in the
     * background while this method returns.  The returned `DownloadTaskExecutor`
     * is already running – callers may subscribe to its `state$`, `progress$` and
     * `error$` streams to follow progress or await `executor.start()` themselves.
     */
    public async download(capability: string, localization?: string): Promise<DownloadTaskExecutor> {
        const config = await this.getConfig(capability, localization);

        if (this.artifactStorage.hasAllFiles(config)) {
            this.logger.debug(`Model ${config.capability} (${config.id}) already exists`);

            const completedExecutor = DownloadTaskExecutor.createCompleted(
                config.capability,
                config,
                this.logger,
                this.artifactStorage,
                new ChecksumVerifier(),
            );

            return completedExecutor;
        }

        const queueItem = await this.downloadTaskManager.add(config.capability, localization);
        const executor = this.downloadTaskManager.getOrCreateExecutor(queueItem, config);

        executor.start().catch(() => {
            // Rejection is intentional and will be handled by the caller.
        });

        return executor;
    }

    /**
     * Downloads the model bundle if needed and resolves once every file is on
     * disk. Unlike download(), the returned executor is guaranteed completed
     * (or the promise rejects), so callers can read artifacts immediately.
     */
    public async ensureDownloaded(capability: string, localization?: string): Promise<DownloadTaskExecutor> {
        const executor = await this.download(capability, localization);
        await this.waitForExecutor(executor);
        return executor;
    }

    /**
     * Reads a text artifact from a downloaded bundle, resolved by file role
     * (e.g. 'config' for the model configuration). Returns null only when the
     * artifact is not on disk; an absent role throws from the storage.
     */
    public async getArtifactText(capability: string, role: InferenceModelFileRole): Promise<string | null> {
        const config = await this.configProvider.getConfig(capability);
        const file = this.artifactStorage.getFileByRole(config, role);

        const artifact = this.artifactStorage.getFile(config, file);
        return artifact.exists ? artifact.text() : null;
    }

    public async getConfig(key: string, appLanguage?: string): Promise<ModelConfig> {
        return this.configProvider.getConfig(key, appLanguage);
    }

    public async getConfigs(appLanguage?: string): Promise<Record<string, ModelConfig>> {
        return this.configProvider.getConfigs(appLanguage);
    }

    public async isModelDownloaded(capability: string, appLanguage?: string): Promise<boolean> {
        const config = await this.getConfig(capability, appLanguage);
        return this.artifactStorage.hasAllFiles(config);
    }

    public async getLocalPath(capability: string, _version?: string): Promise<string | undefined> {
        // Try active session first
        const session = this.downloadTaskManager.getActiveSession(capability);
        if (session) {
            const file = this.artifactStorage.getFileByRole(session.config, 'model');
            if (file != null) {
                return this.artifactStorage.getUri(session.config, file);
            }
        }

        // Fallback: check if model files exist on disk without an active session
        const config = await this.configProvider.getConfig(capability);
        if (this.artifactStorage.hasAllFiles(config)) {
            const file = this.artifactStorage.getFileByRole(config, 'model');
            if (file != null) {
                return this.artifactStorage.getUri(config, file);
            }
        }

        return undefined;
    }

    public async getTotalSize(appLanguage?: string): Promise<number> {
        return this.configProvider.getTotalSize(appLanguage);
    }

    private waitForExecutor(executor: DownloadTaskExecutor): Promise<void> {
        const terminalError = (state: DownloadState): InferenceModelDownloaderException =>
            new InferenceModelDownloaderException(`Model download ended with state ${state}`);

        return new Promise<void>((resolve, reject) => {
            const settle = (state: DownloadState): void => {
                if (state === DownloadState.Completed) {
                    unsubscribe();
                    resolve();
                } else if (state === DownloadState.Failed || state === DownloadState.Cancelled) {
                    unsubscribe();
                    reject(terminalError(state));
                }
            };
            const unsubscribe = executor.state$.onChange(({ value }) => {
                settle(value);
            });
            // the download may have completed between download() and this subscription
            settle(executor.state$.get());
        });
    }
}

Container.register(Downloader, () => {
    const appConfig = Container.get(AppConfig);
    const logger = Container.get(AppLogger);
    const repository = Database.getEntityManager().getRepository(DownloadQueue);

    return new Downloader(
        logger,
        new ModelArtifactStorage(logger, appConfig),
        new DownloadTaskManager(
            logger,
            repository,
            new ChecksumVerifier(),
            new ModelArtifactStorage(logger, appConfig),
        ),
        new ConfigProvider(logger),
    );
});