/**
 * InferenceManager – Background worker for inference artifacts (Whisper, Camembert/BERT).
 * Queues artifacts by Therapist.languages. Exposes getState$() and useArtifactDownloadProgress() for Home banner.
 * Uses expo-file-system File.downloadFileAsync. Optional WiFi-only check.
 */

import { observable } from '@legendapp/state';
import { useSelector } from '@legendapp/state/react';
import { Directory, File, Paths } from 'expo-file-system';
import type { Therapist } from '../Entity/Therapist';
import type { LoggerInterface } from './Logger';
import { appLogger } from './Logger';

export interface ArtifactSpec {
    key: string;
    url: string;
    localPath: string;
}

export interface ArtifactDownloadProgressState {
    progress: number;
    isReady: boolean;
    isDownloading: boolean;
}

const ARTIFACT_SPECS: Record<string, ArtifactSpec[]> = {
    fr: [
        {
            key: 'whisper_fr',
            url: 'https://example.com/artifacts/whisper_medium_int8.onnx',
            localPath: 'artifacts/whisper_medium_int8.onnx',
        },
        {
            key: 'camembert_ner',
            url: 'https://example.com/artifacts/camembert_ner.onnx',
            localPath: 'artifacts/camembert_ner.onnx',
        },
    ],
    en: [
        {
            key: 'whisper_en',
            url: 'https://example.com/artifacts/whisper_medium_int8.en.onnx',
            localPath: 'artifacts/whisper_medium_int8.en.onnx',
        },
        {
            key: 'bert_ner',
            url: 'https://example.com/artifacts/bert_ner.onnx',
            localPath: 'artifacts/bert_ner.onnx',
        },
    ],
};

export class InferenceManager {
    private downloadPromise: Promise<void> | null = null;
    private readonly log: LoggerInterface;
    private readonly state$ = observable<ArtifactDownloadProgressState>({
        progress: 0,
        isReady: true,
        isDownloading: false,
    });

    public constructor(logger: LoggerInterface = appLogger) {
        this.log = logger;
    }

    /**
     * Start downloading missing artifacts for the given therapist. Idempotent; safe to call on Home mount.
     */
    public async downloadMissingArtifacts(therapist: Therapist | null): Promise<void> {
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
            this.log.warn('[InferenceManager] Skipping download: not on WiFi');
            return;
        }
        if (this.downloadPromise) {
            return this.downloadPromise;
        }
        let completed = 0;
        const total = specs.length;
        this.downloadPromise = (async () => {
            this.state$.set({ progress: 0, isReady: false, isDownloading: true });
            try {
                for (const spec of specs) {
                    await this.downloadOne(spec, (p) => {
                        const overall = (completed + p) / total;
                        this.state$.progress.set(overall);
                    });
                    completed += 1;
                    this.state$.progress.set(completed / total);
                }
                this.state$.set({ progress: 1, isReady: true, isDownloading: false });
            } catch (error: unknown) {
                this.log.warn('[InferenceManager] Download error', {
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

    public getState$() {
        return this.state$;
    }

    private collectSpecs(languages: string[]): ArtifactSpec[] {
        const seen = new Set<string>();
        const out: ArtifactSpec[] = [];
        for (const lang of languages) {
            const specs = ARTIFACT_SPECS[lang];
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

    private async downloadOne(spec: ArtifactSpec, onProgress: (p: number) => void): Promise<string> {
        const pathParts = spec.localPath.split('/');
        const file = new File(Paths.document, spec.localPath);
        if (file.exists) {
            return file.uri;
        }
        const parentPath = pathParts.slice(0, -1);
        if (parentPath.length > 0) {
            const parentDir = new Directory(Paths.document, parentPath.join('/'));
            if (!parentDir.exists) {
                parentDir.create({ intermediates: true, idempotent: true });
            }
        }
        onProgress(0);
        await File.downloadFileAsync(spec.url, file, { idempotent: true });
        onProgress(1);

        return file.uri;
    }

    private async ensureWiFiOnly(): Promise<boolean> {
        return true;
    }

    private getLanguages(therapist: Therapist | null): string[] {
        if (!therapist) {
            return [];
        }
        const raw = therapist.languages;
        if (Array.isArray(raw)) {
            return raw;
        }
        try {
            const parsed = JSON.parse(typeof raw === 'string' ? raw : '[]') as unknown;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
}

const inferenceManager = new InferenceManager();

/**
 * Hook: returns { progress, isReady, isDownloading }. Updates when InferenceManager state changes.
 * Component using this hook should be wrapped with observer() so it re-renders on progress updates.
 */
export function useArtifactDownloadProgress(): ArtifactDownloadProgressState {
    const state = inferenceManager.getState$();
    return useSelector(() => ({
        progress: state.progress.get(),
        isReady: state.isReady.get(),
        isDownloading: state.isDownloading.get(),
    }));
}

export { inferenceManager };
