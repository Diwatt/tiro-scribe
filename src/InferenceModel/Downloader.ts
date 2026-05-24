import { AppConfig } from '@/Core/AppConfig';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Registry } from '@/Database/Registry';
import type { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import type { ModelConfig } from '../Api';
import { DownloadQueue } from '../Entity';
import { ConfigProvider } from './ConfigProvider';
import { ChecksumVerifier } from './Download/ChecksumVerifier';
import { DownloadTaskExecutor } from './Download/DownloadTaskExecutor';
import { DownloadTaskManager } from './Download/DownloadTaskManager';
import { ModelArtifactStorage } from './Download/ModelArtifactStorage';

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
            const file = session.config.files[0];
            if (file) {
                return this.artifactStorage.getUri(session.config, file);
            }
        }

        // Fallback: check if model files exist on disk without an active session
        const config = await this.configProvider.getConfig(capability);
        if (this.artifactStorage.hasAllFiles(config)) {
            const file = config.files[0];
            if (file) {
                return this.artifactStorage.getUri(config, file);
            }
        }

        return undefined;
    }

    public async getTotalSize(appLanguage?: string): Promise<number> {
        return this.configProvider.getTotalSize(appLanguage);
    }
}

Container.register(Downloader, () => {
    const appConfig = Container.get(AppConfig);
    const logger = Container.get(AppLogger);
    const repository = Container.get(Registry).getRepository<DownloadQueueRepository>(DownloadQueue);

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