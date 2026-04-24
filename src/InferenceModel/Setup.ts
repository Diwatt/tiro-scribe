/**
 * Setup - Handles inference model download orchestration.
 */

import { Container } from '@/Core/Container';
import { Localization } from '@/Localization';
import type { DownloadTaskExecutor } from './Download/DownloadTaskExecutor';
import { ExecutorCollection } from './Download/ExecutorCollection';
import { Downloader } from './Downloader';

export class Setup {
    private static readonly CAPABILITIES = ['vad', 'asr', 'pitch', 'speaker_id'] as const;

    private readonly localization: Localization;
    private readonly modelDownloader: Downloader;

    public constructor(localization: Localization, modelDownloader: Downloader) {
        this.localization = localization;
        this.modelDownloader = modelDownloader;
    }

    /**
     * Check if all required models are already downloaded.
     */
    public async isSetup(): Promise<boolean> {
        try {
            const appLanguage = this.localization.getLocale();
            for (const capability of Setup.CAPABILITIES) {
                if (!(await this.modelDownloader.isModelDownloaded(capability, appLanguage))) {
                    return false;
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get estimated total download size in MB.
     */
    public async getTotalDownloadSizeMB(): Promise<number> {
        try {
            const appLanguage = this.localization.getLocale();
            const sizeBytes = await this.modelDownloader.getTotalSize(appLanguage);
            return sizeBytes / (1024 * 1024);
        } catch {
            return 0;
        }
    }

    /**
     * Get executor collection for all required models.
     */
    public async getExecutors(): Promise<ExecutorCollection> {
        const appLanguage = this.localization.getLocale();
        const executorCollection = new ExecutorCollection();
        const executors: DownloadTaskExecutor[] = [];

        for (const capability of Setup.CAPABILITIES) {
            const executor = await this.modelDownloader.download(capability, appLanguage);
            executors.push(executor);
        }

        executorCollection.setExecutors(executors);
        return executorCollection;
    }
}

Container.register(Setup, () => {
    return new Setup(Container.get(Localization), Container.get(Downloader));
});
