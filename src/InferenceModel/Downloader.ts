import { AppConfig } from '@/Core/AppConfig';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Registry } from '@/Database/Registry';
import type { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import type { InferenceModelFile, ModelConfig } from '../Api';
import { DownloadQueue, DownloadQueueStatus } from '../Entity';
import { ConfigProvider } from './ConfigProvider';
import { ChecksumVerifier } from './Download/ChecksumVerifier';
import { DownloadTaskExecutor } from './Download/DownloadTaskExecutor';
import { DownloadTaskManager } from './Download/DownloadTaskManager';
import { ModelArtifactStorage } from './Download/ModelArtifactStorage';
import { DownloadState } from './Download/Type';

// Re-export types from Type.ts
export type { ModelConfig } from '../Api';

export class Downloader {
    public constructor(
        private readonly logger: AppLogger,
        private readonly artifactStorage: ModelArtifactStorage,
        private readonly downloadTaskManager: DownloadTaskManager,
        private readonly configProvider: ConfigProvider,
    ) {}

    // Core operations

    public async delete(capability: string, version?: string): Promise<void> {
        const config = await this.getConfig(capability);

        if (version && config.version !== version) {
            this.logger.warn(`Version ${version} not found for ${capability}, deleting all versions`);
        }

        await this.artifactStorage.deleteModelConfig(config);
        const session = this.downloadTaskManager.getActiveSession(capability);
        if (session) {
            this.downloadTaskManager.removeSession(session.capability);
        }

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

    public async enqueueDownload(capability: string, language?: string): Promise<void> {
        await this.configProvider.getConfig(capability, language);

        await this.downloadTaskManager.add(capability, language);
        await this.downloadTaskManager.processQueue((cap: string, lang2?: string) =>
            this.configProvider.getConfig(cap, lang2),
        );
    }

    public async getConfig(key: string, appLanguage?: string): Promise<ModelConfig> {
        return this.configProvider.getConfig(key, appLanguage);
    }

    public async getConfigs(appLanguage?: string): Promise<Record<string, ModelConfig>> {
        return this.configProvider.getConfigs(appLanguage);
    }

    public async getLocalUris(capability: string, appLanguage?: string): Promise<string[]> {
        const config = await this.getConfig(capability, appLanguage);
        return config.files.map((file) => this.artifactStorage.getUri(config, file));
    }

    public async getPrimaryLocalUri(capability: string, appLanguage?: string): Promise<string> {
        const config = await this.getConfig(capability, appLanguage);
        return this.artifactStorage.getModelUri(config);
    }

    public getLocalPath(capability: string, _version?: string): string | undefined {
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
            uri = this.artifactStorage.toAbsoluteUri(uri);
        }

        return uri;
    }

    public getLocalPathForFile(config: ModelConfig, file: InferenceModelFile): string {
        let uri = this.artifactStorage.getUri(config, file);

        if (!uri.startsWith('file://') && !uri.startsWith('/')) {
            uri = this.artifactStorage.toAbsoluteUri(uri);
        }

        return uri;
    }

    public async getTotalSize(appLanguage?: string): Promise<number> {
        return this.configProvider.getTotalSize(appLanguage);
    }

    public async isModelDownloaded(capability: string, appLanguage?: string): Promise<boolean> {
        try {
            const config = await this.getConfig(capability, appLanguage);
            return this.artifactStorage.hasAllFiles(config);
        } catch {
            return false;
        }
    }

    public async getConfigByLocalPath(localPath: string): Promise<ModelConfig | undefined> {
        const localConfigs = await this.getLocalConfigs();

        for (const config of Object.values(localConfigs)) {
            for (const file of config.files) {
                const filePath = this.artifactStorage.resolvePath(config, file);
                if (filePath === localPath || filePath.endsWith(localPath)) {
                    return config;
                }
            }
        }

        return undefined;
    }

    private async getLocalConfigs(): Promise<Record<string, ModelConfig>> {
        const sessions = this.downloadTaskManager.getActiveSessions();
        const configs: Record<string, ModelConfig> = {};

        for (const session of sessions) {
            if (session.getState() === DownloadState.Completed) {
                configs[session.capability] = session.config;
            }
        }

        return configs;
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