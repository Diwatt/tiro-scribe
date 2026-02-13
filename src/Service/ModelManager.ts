/**
 * ModelManager – Background worker for heavy AI models (Whisper, Camembert/BERT).
 * Queues models by Therapist.languages. Exposes getState$() and useModelDownloadProgress() for Home banner.
 * Uses FileSystem.createDownloadResumable. Optional WiFi-only check.
 */

import { observable } from '@legendapp/state';
import { useSelector } from '@legendapp/state/react';
import * as FileSystem from 'expo-file-system/legacy';
import type { Therapist } from '../Entity/Therapist';
import { ModelDownloadError } from '../Exception/ModelDownloadError';
import type { LoggerInterface } from './Logger';
import { AppLogger } from './Logger';

export interface ModelSpec {
    key: string;
    url: string;
    localPath: string;
}

export interface ModelDownloadProgressState {
    progress: number;
    isReady: boolean;
    isDownloading: boolean;
}

const MODEL_SPECS: Record<string, ModelSpec[]> = {
    fr: [
        {
            key: 'whisper_fr',
            url: 'https://example.com/models/whisper_medium_int8.onnx',
            localPath: 'models/whisper_medium_int8.onnx',
        },
        {
            key: 'camembert_ner',
            url: 'https://example.com/models/camembert_ner.onnx',
            localPath: 'models/camembert_ner.onnx',
        },
    ],
    en: [
        {
            key: 'whisper_en',
            url: 'https://example.com/models/whisper_medium_int8.en.onnx',
            localPath: 'models/whisper_medium_int8.en.onnx',
        },
        { key: 'bert_ner', url: 'https://example.com/models/bert_ner.onnx', localPath: 'models/bert_ner.onnx' },
    ],
};

export class ModelManager {
    private static instance: ModelManager | null = null;
    private readonly log: LoggerInterface;
    private readonly state$ = observable<ModelDownloadProgressState>({
        progress: 0,
        isReady: true,
        isDownloading: false,
    });
    private downloadPromise: Promise<void> | null = null;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.log = logger;
    }

    static getInstance(): ModelManager {
        if (ModelManager.instance == null) {
            ModelManager.instance = new ModelManager();
        }
        return ModelManager.instance;
    }

    getState$() {
        return this.state$;
    }

    /**
     * Start downloading missing models for the given therapist. Idempotent; safe to call on Home mount.
     */
    async downloadMissingModels(therapist: Therapist | null): Promise<void> {
        const languages = this.getLanguages(therapist);
        if (languages.length === 0) {
            this.state$.set({ progress: 1, isReady: true, isDownloading: false });
            return;
        }
        const specs = this.collectSpecs(languages);
        if (specs.length === 0) {
            this.state$.set({ progress: 1, isReady: true, isDownloading: false });
            return;
        }
        const wifiOk = await this.ensureWiFiOnly();
        if (!wifiOk) {
            this.log.warn('[ModelManager] Skipping download: not on WiFi');
            return;
        }
        if (this.downloadPromise) {
            return this.downloadPromise;
        }
        const docDir = FileSystem.documentDirectory ?? '';
        let completed = 0;
        const total = specs.length;
        this.downloadPromise = (async () => {
            this.state$.set({ progress: 0, isReady: false, isDownloading: true });
            try {
                for (const spec of specs) {
                    await this.downloadOne(spec, docDir, (p) => {
                        const overall = (completed + p) / total;
                        this.state$.progress.set(overall);
                    });
                    completed += 1;
                    this.state$.progress.set(completed / total);
                }
                this.state$.set({ progress: 1, isReady: true, isDownloading: false });
            } catch (error: unknown) {
                this.log.warn('[ModelManager] Download error', {
                    error: error instanceof Error ? error.message : String(error),
                });
                this.state$.set({
                    progress: this.state$.progress.get(),
                    isReady: false,
                    isDownloading: false,
                });
            } finally {
                this.downloadPromise = null;
            }
        })();
        return this.downloadPromise;
    }

    private getLanguages(therapist: Therapist | null): string[] {
        if (!therapist) {
            return [];
        }
        try {
            const raw = therapist.getLanguages();
            const parsed = JSON.parse(raw || '[]') as string[];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private collectSpecs(languages: string[]): ModelSpec[] {
        const seen = new Set<string>();
        const out: ModelSpec[] = [];
        for (const lang of languages) {
            const specs = MODEL_SPECS[lang];
            if (!specs) {
                continue;
            }
            for (const s of specs) {
                if (seen.has(s.key)) {
                    continue;
                }
                seen.add(s.key);
                out.push(s);
            }
        }
        return out;
    }

    private async ensureWiFiOnly(): Promise<boolean> {
        return true;
    }

    private async downloadOne(spec: ModelSpec, docDir: string, onProgress: (p: number) => void): Promise<string> {
        const localPath = `${docDir}${spec.localPath}`;
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
            return localPath;
        }
        const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));
        const dirInfo = await FileSystem.getInfoAsync(dirPath);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
        }
        const downloadResumable = FileSystem.createDownloadResumable(spec.url, localPath, {}, (ev) => {
            const total = ev.totalBytesExpectedToWrite ?? 1;
            const written = ev.totalBytesWritten ?? 0;
            onProgress(total > 0 ? written / total : 0);
        });
        const result = await downloadResumable.downloadAsync();
        if (!result || result.status !== 200) {
            throw new ModelDownloadError(`Download failed for ${spec.key}: status ${result?.status ?? 'unknown'}`, new Error(String(result?.status)));
        }
        return localPath;
    }
}

const modelManager = ModelManager.getInstance();

/**
 * Hook: returns { progress, isReady, isDownloading }. Updates when ModelManager state changes.
 * Component using this hook should be wrapped with observer() so it re-renders on progress updates.
 */
export function useModelDownloadProgress(): ModelDownloadProgressState {
    const state$ = modelManager.getState$();
    return useSelector(() => ({
        progress: state$.progress.get(),
        isReady: state$.isReady.get(),
        isDownloading: state$.isDownloading.get(),
    }));
}

export { modelManager };
