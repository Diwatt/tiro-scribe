/**
 * InferenceModelDownloader – Orchestrator for downloading and caching inference model files.
 * Coordinates multiple specialized components following SOLID principles.
 *
 * Components:
 * - ModelArtifactStorage: Handles file system operations for model artifacts
 * - ChecksumVerifier: Validates SHA256 checksums
 * - DownloadSessionManager: Tracks download sessions and state
 * - FileDownloader: Actually downloads files with progress tracking
 */

import type { InferenceModelFile, SelectedVariant } from '@/Api';
import { apiClientRegistry, InferenceModelClient } from '@/Api';
import { ApiClientException } from '@/Exception';
import { InferenceModelDownloaderException } from '@/Exception/InferenceModelDownloaderException';
import { AppLogger, type LoggerInterface } from './Logger';
import { ModelArtifactStorage } from './InferenceModelDownload/ModelArtifactStorage';
import { ChecksumVerifier } from './InferenceModelDownload/ChecksumVerifier';
import { DownloadSessionManager } from './InferenceModelDownload/DownloadSessionManager';
import { type DownloadSession, DownloadState } from './InferenceModelDownload/DownloadSession';
import { FileDownloader } from './InferenceModelDownload/FileDownloader';

export type { SelectedVariant, DownloadSession };
export type { DownloadState } from './InferenceModelDownload/DownloadSession';

export class InferenceModelDownloader {
    private static instance: InferenceModelDownloader | null = null;

    private readonly artifactStorage: ModelArtifactStorage;
    private readonly checksumVerifier: ChecksumVerifier;
    private readonly sessionManager: DownloadSessionManager;
    private readonly fileDownloader: FileDownloader;

    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {
        // Initialize components with dependency injection
        this.artifactStorage = new ModelArtifactStorage(logger);
        this.checksumVerifier = new ChecksumVerifier();
        this.sessionManager = new DownloadSessionManager();
        this.fileDownloader = new FileDownloader(logger);
    }

    public static getInstance(): InferenceModelDownloader {
        if (InferenceModelDownloader.instance == null) {
            InferenceModelDownloader.instance = new InferenceModelDownloader();
        }

        return InferenceModelDownloader.instance;
    }

    /** Path to a specific file in the variant. Relative under document dir. */
    public getLocalPathForFile(config: SelectedVariant, file: InferenceModelFile): string {
        return this.artifactStorage.resolvePath(config, file);
    }

    /**
     * Start downloading a model for a specific capability and language.
     * Returns a session ID that can be used to track progress and control the download.
     */
    public async fetch(capability: string, appLanguage?: string): Promise<string> {
        const config = await this.getConfig(capability, appLanguage);

        // Create session
        const session = this.sessionManager.create(config.capability, config);

        // Start download asynchronously
        this.startDownload(session).catch((error) => {
            this.logger.error(`Download failed for ${capability}:`, error);
        });

        return config.capability;
    }

    /**
     * Get the current session for a capability.
     */
    public getSession(capability: string): DownloadSession | undefined {
        return this.sessionManager.get(capability);
    }

    /**
     * Get all active download sessions.
     */
    public getSessions(): DownloadSession[] {
        return this.sessionManager.all();
    }

    /**
     * Check if a download is in progress for a capability.
     */
    public isDownloading(capability: string): boolean {
        const session = this.sessionManager.get(capability);
        return session?.isDownloading() ?? false;
    }

    /**
     * Cancel an ongoing download for a capability.
     * This will mark the session as cancelled and clean up any partially downloaded files.
     */
    public async cancel(capability: string): Promise<void> {
        const session = this.sessionManager.get(capability);
        if (!session) {
            return;
        }

        if (session.isDownloading()) {
            // Mark as cancelled
            session.cancel();

            // Clean up any partially downloaded files
            try {
                await this.artifactStorage.deleteVariant(session.config);
            } catch (error) {
                this.logger.warn(`Failed to clean up files after cancelling ${capability}:`, error);
            }

            this.logger.info(`Download cancelled for ${capability}`);
        }
    }

    /**
     * Remove a completed or failed session from tracking.
     */
    public removeSession(capability: string): void {
        this.sessionManager.remove(capability);
    }

    /**
     * Clear all sessions (useful for cleanup).
     */
    public clearSessions(): void {
        this.sessionManager.clearAll();
    }

    public async delete(config: SelectedVariant): Promise<void> {
        await this.artifactStorage.deleteVariant(config);
    }

    public async ensureCached(config: SelectedVariant, onProgress?: (progress: number) => void): Promise<string> {
        // Check if already cached
        if (this.artifactStorage.hasPrimary(config)) {
            const uri = this.artifactStorage.getPrimaryUri(config);
            this.logger.debug(`Model ${config.capability} (${config.id}) already exists at ${uri}`);
            return uri;
        }

        // Check if there's already a session for this capability
        let session = this.sessionManager.get(config.capability);
        if (!session) {
            // Create a temporary session for tracking
            session = this.sessionManager.create(config.capability, config);
        }

        // Update session state
        session.setState(DownloadState.Downloading);

        try {
            // Download the model with progress tracking
            await this.downloadVariant(config, (progress) => {
                session.setProgress(progress);
                if (onProgress) {
                    onProgress(progress);
                }
            });

            // Update session to completed
            session.setState(DownloadState.Completed);
            session.setProgress(1);

            return this.artifactStorage.getPrimaryUri(config);
        } catch (error) {
            // Update session to failed
            session.setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    public async ensureCachedByKey(key: string, onProgress?: (progress: number) => void, appLanguage?: string): Promise<string> {
        const config = await this.getConfig(key, appLanguage);
        return this.ensureCached(config, onProgress);
    }

    public async ensureManyCached(configs: SelectedVariant[], onProgress?: (capability: string, progress: number) => void): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        await Promise.all(
            configs.map(async (config) => {
                const path = await this.ensureCached(config, onProgress ? (progress) => onProgress(config.capability, progress) : undefined);
                results[config.capability] = path;
            }),
        );

        return results;
    }

    /** Resolved config for one capability; delegates to API client. */
    public async getConfig(key: string, appLanguage?: string): Promise<SelectedVariant> {
        try {
            const resolved = await apiClientRegistry.get(InferenceModelClient).getInferenceModels(appLanguage);
            const one = resolved[key];
            if (one == null) {
                throw new ApiClientException(`Unknown capability: ${key}`, 'UNKNOWN_CAPABILITY');
            }

            return one;
        } catch (error) {
            this.logger.warn('[InferenceModelDownloader] getConfig failed', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new InferenceModelDownloaderException(
                error instanceof Error ? error.message : 'Model configs unavailable. Please check your connection and retry.',
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    public async getConfigByLocalPath(localPath: string, appLanguage?: string): Promise<SelectedVariant | null> {
        const resolved = await this.getResolvedConfigs(appLanguage);
        for (const config of Object.values(resolved)) {
            const primaryPath = this.artifactStorage.resolvePath(config, config.files[0]);
            if (primaryPath === localPath) {
                return config;
            }
            for (const file of config.files) {
                const filePath = this.artifactStorage.resolvePath(config, file);
                const f = this.artifactStorage.getFile(config, file);
                if (filePath === localPath || f.uri === localPath) {
                    return config;
                }
            }
        }

        return null;
    }

    /** All configs resolved for the given app language (one per capability); delegates to API client. */
    public async getResolvedConfigs(appLanguage?: string): Promise<Record<string, SelectedVariant>> {
        try {
            return await apiClientRegistry.get(InferenceModelClient).getInferenceModels(appLanguage);
        } catch (error) {
            this.logger.warn('[InferenceModelDownloader] getInferenceModels failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new InferenceModelDownloaderException(
                error instanceof Error ? error.message : 'Model configs unavailable. Please check your connection and retry.',
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    public getProgress(capability: string): number {
        const session = this.sessionManager.get(capability);
        return session?.getProgress() ?? 0;
    }

    public async getTotalSize(appLanguage?: string): Promise<number> {
        const resolved = await this.getResolvedConfigs(appLanguage);
        return this.artifactStorage.calculateTotalSize(Object.values(resolved));
    }

    /**
     * Download all files for a model variant with fine-grained progress tracking.
     * This method orchestrates the download of multiple files, handling progress
     * tracking, checksum verification, and error handling.
     */
    private async downloadVariant(config: SelectedVariant, onProgress?: (progress: number) => void): Promise<void> {
        this.logger.info(`Fetching model variant ${config.capability} (${config.id}) – ${config.files.length} file(s)...`);

        // Ensure directories exist
        this.artifactStorage.ensureDirectories(config);

        const totalFiles = config.files.length;
        if (totalFiles === 0) {
            if (onProgress) {
                onProgress(1);
            }
            this.logger.info(`Model variant ${config.capability} has no files to download`);
            return;
        }

        const progressPerFile = 1 / totalFiles;

        if (onProgress) {
            onProgress(0);
        }

        try {
            for (let i = 0; i < config.files.length; i++) {
                const file = config.files[i];
                const fileObj = this.artifactStorage.getFile(config, file);

                // Skip if file already exists
                if (fileObj.exists) {
                    this.logger.debug(`File already exists: ${fileObj.uri}`);
                    if (onProgress) {
                        onProgress((i + 1) * progressPerFile);
                    }
                    continue;
                }

                // Download the file with byte-level progress tracking using modern async generator
                for await (const fileProgress of this.fileDownloader.downloadFile(file.url, fileObj)) {
                    if (onProgress) {
                        // Combine file-level progress with within-file progress
                        const baseProgress = i * progressPerFile;
                        const fileContribution = fileProgress * progressPerFile;
                        onProgress(baseProgress + fileContribution);
                    }
                }

                this.logger.debug(`Downloaded: ${file.url} -> ${fileObj.uri}`);

                // Verify checksum if provided
                const hash = file.hash?.trim();
                if (hash != null && hash !== '') {
                    if (onProgress) {
                        // Set verifying state (90% through this file's progress)
                        onProgress((i + 0.9) * progressPerFile);
                    }

                    await this.checksumVerifier.verify(fileObj, hash);
                    this.logger.debug(`Checksum verified: ${fileObj.uri}`);
                }

                if (onProgress) {
                    onProgress((i + 1) * progressPerFile);
                }
            }

            if (onProgress) {
                onProgress(1);
            }

            this.logger.info(`Model variant ${config.capability} downloaded successfully`);
        } catch (error) {
            this.logger.error(`Failed to download model variant ${config.capability}:`, error);
            throw new InferenceModelDownloaderException(
                `Failed to fetch model variant ${config.capability}: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    private async startDownload(session: DownloadSession): Promise<void> {
        try {
            // Update session state
            session.setState(DownloadState.Downloading);

            // Download the model with progress tracking
            await this.downloadVariant(session.config, (progress: number) => {
                session.setProgress(progress);
            });

            // Mark as completed
            session.setState(DownloadState.Completed);
            session.setProgress(1);

            this.logger.info(`Download completed for ${session.capability}`);
        } catch (error) {
            session.setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
}
