/**
 * ArtifactRegistry – Fetches and caches inference artifacts (ONNX) on first app launch.
 * Artifact configs come from the API client (GET /artifacts, cache, resolution by language).
 * This class handles only file operations: download, checksum, local path.
 * Local path pattern from AppConfig.artifactStorageDirName (e.g. artifacts/${config.id}.onnx).
 */

import { apiRegistry, ModelArtifact } from '@/Api';
import type { ArtifactDescriptor } from '@/Api';
import { AppConfig } from '@/Config/AppConfig';
import { ApiClientException } from '@/Exception';
import { Directory, File, Paths } from 'expo-file-system';
import { ArtifactRegistryException } from '../Exception/ArtifactRegistryException';
import { AppLogger, type LoggerInterface } from './Logger';

export type { ArtifactDescriptor };

export class ArtifactRegistry {
    private static instance: ArtifactRegistry | null = null;
    private readonly progressByUseCase: Map<string, number> = new Map();

    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {}

    public static getInstance(): ArtifactRegistry {
        if (ArtifactRegistry.instance == null) {
            ArtifactRegistry.instance = new ArtifactRegistry();
        }

        return ArtifactRegistry.instance;
    }

    /** Relative path under document dir (e.g. artifacts/${config.id}.onnx). */
    public getLocalPath(config: ArtifactDescriptor): string {
        return `${AppConfig.artifactStorageDirName}/${config.id}.onnx`;
    }

    public async delete(config: ArtifactDescriptor): Promise<void> {
        const file = this.getFile(config);
        if (file.exists) {
            file.delete();
            this.logger.debug(`Deleted artifact ${config.useCase} from ${file.uri}`);
        }
    }

    public async ensureCached(
        config: ArtifactDescriptor,
        onProgress?: (progress: number) => void,
    ): Promise<string> {
        const subdir = AppConfig.artifactStorageDirName;
        const file = this.getFile(config);
        if (file.exists) {
            this.logger.debug(
                `Artifact ${config.useCase} (${config.id}) already exists at ${file.uri}`,
            );
            return file.uri;
        }

        const artifactsDir = new Directory(Paths.document, subdir);
        if (!artifactsDir.exists) {
            artifactsDir.create({ intermediates: true, idempotent: true });
        }

        this.logger.info(
            `Fetching artifact ${config.useCase} (${config.id}) from ${config.url}...`,
        );

        if (onProgress) {
            this.progressByUseCase.set(config.useCase, 0);
            onProgress(0);
        }

        try {
            await File.downloadFileAsync(config.url, file, { idempotent: true });

            const hash = config.hash?.trim();
            if (hash != null && hash !== '') {
                await this.verifyChecksum(file, hash);
            }

            this.progressByUseCase.set(config.useCase, 1);
            if (onProgress) {
                onProgress(1);
            }
            this.logger.info(`Artifact ${config.useCase} cached at ${file.uri}`);

            return file.uri;
        } catch (error) {
            if (file.exists) {
                file.delete();
            }
            throw new ArtifactRegistryException(
                `Failed to fetch artifact ${config.useCase}: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    public async ensureCachedByKey(
        key: string,
        onProgress?: (progress: number) => void,
        appLanguage?: string,
    ): Promise<string> {
        const config = await this.getConfig(key, appLanguage);
        return this.ensureCached(config, onProgress);
    }

    public async ensureManyCached(
        configs: ArtifactDescriptor[],
        onProgress?: (useCase: string, progress: number) => void,
    ): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        await Promise.all(
            configs.map(async (config) => {
                const path = await this.ensureCached(
                    config,
                    onProgress ? (progress) => onProgress(config.useCase, progress) : undefined,
                );
                results[config.useCase] = path;
            }),
        );

        return results;
    }

    /** Resolved config for one use_case; delegates to API client. */
    public async getConfig(
        key: string,
        appLanguage?: string,
    ): Promise<ArtifactDescriptor> {
        try {
            const resolved = await apiRegistry
                .get(ModelArtifact)
                .getArtifacts(appLanguage);
            const one = resolved[key];
            if (one == null) {
                throw new ApiClientException(`Unknown artifact use_case: ${key}`, 'ARTIFACT_UNKNOWN_USE_CASE');
            }

            return one;
        } catch (error) {
            this.logger.warn('[ArtifactRegistry] getArtifactDescriptor failed', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new ArtifactRegistryException(
                error instanceof Error ? error.message : 'Artifact configs unavailable. Please check your connection and retry.',
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    public async getConfigByLocalPath(
        localPath: string,
        appLanguage?: string,
    ): Promise<ArtifactDescriptor | null> {
        const resolved = await this.getResolvedConfigs(appLanguage);
        for (const config of Object.values(resolved)) {
            const file = this.getFile(config);
            if (this.getLocalPath(config) === localPath || file.uri === localPath) {
                return config;
            }
        }

        return null;
    }

    /** All configs resolved for the given app language (one per use_case); delegates to API client. */
    public async getResolvedConfigs(
        appLanguage?: string,
    ): Promise<Record<string, ArtifactDescriptor>> {
        try {
            return await apiRegistry
            .get(ModelArtifact)
            .getArtifacts(appLanguage);
        } catch (error) {
            this.logger.warn('[ArtifactRegistry] getArtifacts failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new ArtifactRegistryException(
                error instanceof Error ? error.message : 'Artifact configs unavailable. Please check your connection and retry.',
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    public getProgress(useCase: string): number {
        return this.progressByUseCase.get(useCase) ?? 0;
    }

    public async getTotalSize(appLanguage?: string): Promise<number> {
        const resolved = await this.getResolvedConfigs(appLanguage);
        let totalSize = 0;
        for (const config of Object.values(resolved)) {
            const file = this.getFile(config);
            if (file.exists) {
                totalSize += file.size;
            }
        }

        return totalSize;
    }

    private getFile(config: ArtifactDescriptor): File {
        return new File(
            Paths.document,
            AppConfig.artifactStorageDirName,
            `${config.id}.onnx`,
        );
    }

    private async verifyChecksum(file: File, expectedHash: string): Promise<void> {
        const expectedHex = expectedHash.toLowerCase();
        if (!/^[a-f0-9]{64}$/.test(expectedHex)) {
            throw new ArtifactRegistryException(
                `Invalid checksum format for ${file.uri}; expected 64 hex characters. Got: ${expectedHash.slice(0, 32)}${expectedHash.length > 32 ? '...' : ''}`,
            );
        }
        const { createHash } = await import('react-native-quick-crypto');
        const base64 = await file.base64();
        const buffer = Buffer.from(base64, 'base64');
        const digest = createHash('sha256').update(buffer).digest('hex');
        const digestHex =
            typeof digest === 'string'
                ? digest
                : Buffer.from(digest as Uint8Array).toString('hex');
        if (digestHex !== expectedHex) {
            throw new ArtifactRegistryException(
                `Hash mismatch for ${file.uri}: expected ${expectedHex.slice(0, 16)}..., got ${digestHex.slice(0, 16)}...`,
            );
        }
    }
}
