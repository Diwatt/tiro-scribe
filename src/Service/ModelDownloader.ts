/**
 * ModelDownloader - Downloads ONNX models on first app launch.
 * Model configs come from Tiro API GET /models only; no client-side fallback.
 * Local path pattern from AppConfig.modelLocalPathSubdir (e.g. models/${config.id}.onnx).
 */

import { AppConfig } from '@/Config/AppConfig';
import { Directory, File, Paths } from 'expo-file-system';
import type { ModelConfig } from '@/api/generated/models';
import { getModels } from '@/api/generated/models/models';
import { ModelDownloaderException } from '../Exception/ModelDownloaderException';
import { AppLogger, type LoggerInterface } from './Logger';

export type { ModelConfig };

/** Cached model configs from GET /models. */
let modelConfigsCache: Promise<Record<string, ModelConfig>> | null = null;

export class ModelDownloader {
    private static instance: ModelDownloader | null = null;
    private readonly downloadProgress: Map<string, number> = new Map();

    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {}

    public static getInstance(): ModelDownloader {
        if (ModelDownloader.instance == null) {
            ModelDownloader.instance = new ModelDownloader();
        }

        return ModelDownloader.instance;
    }

    /** Relative path under document dir (e.g. models/${config.id}.onnx). */
    public getLocalPath(config: ModelConfig): string {
        return `${AppConfig.modelLocalPathSubdir}/${config.id}.onnx`;
    }

    public async delete(config: ModelConfig): Promise<void> {
        const file = this.fileForConfig(config);
        if (file.exists) {
            file.delete();
            this.logger.debug(`Deleted model ${config.use_case} from ${file.uri}`);
        }
    }

    public async ensureDownloaded(config: ModelConfig, onProgress?: (progress: number) => void): Promise<string> {
        const subdir = AppConfig.modelLocalPathSubdir;
        const file = this.fileForConfig(config);
        if (file.exists) {
            this.logger.debug(`Model ${config.use_case} (${config.id}) already exists at ${file.uri}`);
            return file.uri;
        }

        const modelsDir = new Directory(Paths.document, subdir);
        if (!modelsDir.exists) {
            modelsDir.create({ intermediates: true, idempotent: true });
        }

        this.logger.info(`Downloading model ${config.use_case} (${config.id}) from ${config.url}...`);

        if (onProgress) {
            this.downloadProgress.set(config.use_case, 0);
            onProgress(0);
        }

        try {
            await File.downloadFileAsync(config.url, file, { idempotent: true });

            const hash = config.hash?.trim();
            if (hash != null && hash !== '' && hash.startsWith('sha256:') && hash.length > 7) {
                await this.verifyChecksum(file, hash);
            }

            this.downloadProgress.set(config.use_case, 1);
            if (onProgress) {
                onProgress(1);
            }
            this.logger.info(`Model ${config.use_case} downloaded successfully to ${file.uri}`);

            return file.uri;
        } catch (error) {
            if (file.exists) {
                file.delete();
            }
            throw new ModelDownloaderException(`Failed to download model ${config.use_case}: ${error}`, error instanceof Error ? error : new Error(String(error)));
        }
    }

    public async ensureDownloadedByKey(key: string, onProgress?: (progress: number) => void): Promise<string> {
        const config = await this.getConfig(key);
        return this.ensureDownloaded(config, onProgress);
    }

    public async ensureManyDownloaded(configs: ModelConfig[], onProgress?: (useCase: string, progress: number) => void): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        await Promise.all(
            configs.map(async (config) => {
                const path = await this.ensureDownloaded(config, onProgress ? (progress) => onProgress(config.use_case, progress) : undefined);
                results[config.use_case] = path;
            }),
        );

        return results;
    }

    public async getConfig(key: string): Promise<ModelConfig> {
        const configs = await this.getConfigs();
        const config = configs[key];
        if (config == null) {
            throw new ModelDownloaderException(`Unknown model use_case: ${key}`);
        }

        return config;
    }

    public async getConfigByLocalPath(localPath: string): Promise<ModelConfig | null> {
        const configs = await this.getConfigs();
        for (const config of Object.values(configs)) {
            const file = this.fileForConfig(config);
            if (this.getLocalPath(config) === localPath || file.uri === localPath) {
                return config;
            }
        }

        return null;
    }

    public async getConfigs(): Promise<Record<string, ModelConfig>> {
        if (modelConfigsCache != null) {
            return modelConfigsCache;
        }
        const promise = (async (): Promise<Record<string, ModelConfig>> => {
            let data: Record<string, ModelConfig> | null = null;
            try {
                const response = await getModels();
                data = response.data != null ? (response.data as Record<string, ModelConfig>) : null;
            } catch (error) {
                this.logger.warn('[ModelDownloader] GET /models failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                throw new ModelDownloaderException(
                    'Model configs unavailable. Please check your connection and retry.',
                    error instanceof Error ? error : new Error(String(error)),
                );
            }
            if (data == null || Object.keys(data).length === 0) {
                throw new ModelDownloaderException('Model configs unavailable: GET /models returned no data.');
            }

            return data;
        })();
        modelConfigsCache = promise;
        promise.catch(() => {
            modelConfigsCache = null;
        });

        return modelConfigsCache;
    }

    public getProgress(useCase: string): number {
        return this.downloadProgress.get(useCase) ?? 0;
    }

    public async getTotalSize(): Promise<number> {
        const configs = await this.getConfigs();
        let totalSize = 0;
        for (const config of Object.values(configs)) {
            const file = this.fileForConfig(config);
            if (file.exists) {
                totalSize += file.size;
            }
        }

        return totalSize;
    }

    private fileForConfig(config: ModelConfig): File {
        const subdir = AppConfig.modelLocalPathSubdir;
        return new File(Paths.document, subdir, `${config.id}.onnx`);
    }

    private async verifyChecksum(file: File, expectedHash: string): Promise<void> {
        const match = /^sha256:([a-fA-F0-9]+)$/.exec(expectedHash);
        if (match == null) {
            this.logger.warn('[ModelDownloader] Unsupported hash format, skip verification', {
                expectedHash: expectedHash.slice(0, 20),
            });

            return;
        }
        const expectedHex = match[1].toLowerCase();
        const { createHash } = await import('react-native-quick-crypto');
        const base64 = await file.base64();
        const buffer = Buffer.from(base64, 'base64');
        const digest = createHash('sha256').update(buffer).digest('hex');
        const digestHex = typeof digest === 'string' ? digest : Buffer.from(digest as Uint8Array).toString('hex');
        if (digestHex !== expectedHex) {
            throw new ModelDownloaderException(`Hash mismatch for ${file.uri}: expected ${expectedHex.slice(0, 16)}..., got ${digestHex.slice(0, 16)}...`);
        }
    }
}
