/**
 * InferenceModelSetup - Handles inference model download orchestration.
 *
 * Single Responsibility: Download required inference models (vad, asr, pitch).
 */

import { Container } from '@/Core/Container';
import { Localization } from '@/Localization';
import { ExecutorCollection } from './InferenceModelDownload/ExecutorCollection';
import type { DownloadTaskExecutor } from './InferenceModelDownload/DownloadTaskExecutor';
import { InferenceModelDownloader } from './InferenceModelDownloader';

export class InferenceModelSetup {
    private static readonly CAPABILITIES = ['vad', 'asr', 'pitch'] as const;

    private readonly localization: Localization;
    private readonly modelDownloader: InferenceModelDownloader;

    public constructor(localization: Localization, modelDownloader: InferenceModelDownloader) {
        this.localization = localization;
        this.modelDownloader = modelDownloader;
    }

    /**
     * Check if all required models are already downloaded.
     */
    public async isSetup(): Promise<boolean> {
        try {
            const appLanguage = this.localization.getLocale();
            for (const capability of InferenceModelSetup.CAPABILITIES) {
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

        for (const capability of InferenceModelSetup.CAPABILITIES) {
            const executor = await this.modelDownloader.download(capability, appLanguage);
            executors.push(executor);
        }

        executorCollection.setExecutors(executors);
        return executorCollection;
    }
}

Container.register(InferenceModelSetup, () => {
    return new InferenceModelSetup(Container.get(Localization), Container.get(InferenceModelDownloader));
});
