/**
 * InferenceModelDownloader – Orchestrator for downloading and caching inference model files.
 * Coordinates multiple specialized components following SOLID principles.
 *
 * Components:
 * - InferenceModelConfigResolver: Fetches model configurations from API
 * - ModelFileSystemManager: Handles file system operations and paths
 * - ChecksumVerifier: Validates SHA256 checksums
 * - DownloadSessionManager: Tracks download sessions and state
 * - FileDownloader: Actually downloads files with progress tracking
 */

import type { InferenceModelFile, SelectedVariant } from '@/Api';
import { AppLogger, type LoggerInterface } from './Logger';
import { InferenceModelConfigResolver } from './InferenceModelDownload/InferenceModelConfigResolver';
import { ModelFileSystemManager } from './InferenceModelDownload/ModelFileSystemManager';
import { ChecksumVerifier } from './InferenceModelDownload/ChecksumVerifier';
import { DownloadSessionManager, type DownloadSession } from './InferenceModelDownload/DownloadSessionManager';
import { FileDownloader } from './InferenceModelDownload/FileDownloader';

export type { SelectedVariant, DownloadSession };
export type { DownloadState } from './InferenceModelDownload/DownloadSessionManager';

export class InferenceModelDownloader {
    private static instance: InferenceModelDownloader | null = null;

    private readonly configResolver: InferenceModelConfigResolver;
    private readonly fileSystemManager: ModelFileSystemManager;
    private readonly checksumVerifier: ChecksumVerifier;
    private readonly sessionManager: DownloadSessionManager;
    private readonly fileDownloader: FileDownloader;

    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {
        // Initialize components with dependency injection
        this.configResolver = new InferenceModelConfigResolver(logger);
        this.fileSystemManager = new ModelFileSystemManager(logger);
        this.checksumVerifier = new ChecksumVerifier();
        this.sessionManager = new DownloadSessionManager();
        this.fileDownloader = new FileDownloader(this.fileSystemManager, this.checksumVerifier, logger);
    }

    public static getInstance(): InferenceModelDownloader {
        if (InferenceModelDownloader.instance == null) {
            InferenceModelDownloader.instance = new InferenceModelDownloader();
        }

        return InferenceModelDownloader.instance;
    }

    /** Path to a specific file in the variant. Relative under document dir. */
    public getLocalPathForFile(config: SelectedVariant, file: InferenceModelFile): string {
        return this.fileSystemManager.getLocalPathForFile(config, file);
    }

    /**
     * Start downloading a model for a specific capability and language.
     * Returns a session ID that can be used to track progress and control the download.
     */
    public async fetch(capability: string, appLanguage?: string): Promise<string> {
        const config = await this.configResolver.getConfig(capability, appLanguage);

        // Create session
        const session = this.sessionManager.createSession(config.capability, config);

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
        return this.sessionManager.getSession(capability);
    }

    /**
     * Get all active download sessions.
     */
    public getSessions(): DownloadSession[] {
        return this.sessionManager.getSessions();
    }

    /**
     * Check if a download is in progress for a capability.
     */
    public isDownloading(capability: string): boolean {
        return this.sessionManager.isDownloading(capability);
    }

    /**
     * Cancel an ongoing download for a capability.
     * This will mark the session as cancelled and clean up any partially downloaded files.
     */
    public async cancel(capability: string): Promise<void> {
        const session = this.sessionManager.getSession(capability);
        if (!session) {
            return;
        }

        if (this.sessionManager.isDownloading(capability)) {
            // Mark as cancelled
            this.sessionManager.cancelSession(capability);

            // Clean up any partially downloaded files
            try {
                await this.fileSystemManager.delete(session.config);
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
        this.sessionManager.removeSession(capability);
    }

    /**
     * Clear all sessions (useful for cleanup).
     */
    public clearSessions(): void {
        this.sessionManager.clearSessions();
    }

    public async delete(config: SelectedVariant): Promise<void> {
        await this.fileSystemManager.delete(config);
    }

    public async ensureCached(config: SelectedVariant, onProgress?: (progress: number) => void): Promise<string> {
        // Check if already cached
        if (this.fileSystemManager.primaryFileExists(config)) {
            const uri = this.fileSystemManager.getPrimaryFileUri(config);
            this.logger.debug(`Model ${config.capability} (${config.id}) already exists at ${uri}`);
            return uri;
        }

        // Check if there's already a session for this capability
        let session = this.sessionManager.getSession(config.capability);
        if (!session) {
            // Create a temporary session for tracking
            session = this.sessionManager.createSession(config.capability, config);
        }

        // Update session state
        this.sessionManager.updateSessionState(config.capability, 'downloading');

        try {
            // Download the model with progress tracking
            await this.fileDownloader.downloadModel(config, (progress) => {
                this.sessionManager.updateSessionProgress(config.capability, progress);
                if (onProgress) {
                    onProgress(progress);
                }
            });

            // Update session to completed
            this.sessionManager.updateSessionState(config.capability, 'completed');
            this.sessionManager.updateSessionProgress(config.capability, 1);

            return this.fileSystemManager.getPrimaryFileUri(config);
        } catch (error) {
            // Update session to failed
            this.sessionManager.updateSessionError(config.capability, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    public async ensureCachedByKey(key: string, onProgress?: (progress: number) => void, appLanguage?: string): Promise<string> {
        const config = await this.configResolver.getConfig(key, appLanguage);
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

    /** Resolved config for one capability; delegates to config resolver. */
    public async getConfig(key: string, appLanguage?: string): Promise<SelectedVariant> {
        return this.configResolver.getConfig(key, appLanguage);
    }

    public async getConfigByLocalPath(localPath: string, appLanguage?: string): Promise<SelectedVariant | null> {
        const resolved = await this.configResolver.getResolvedConfigs(appLanguage);
        for (const config of Object.values(resolved)) {
            const primaryPath = this.fileSystemManager.getLocalPathForFile(config, config.files[0]);
            if (primaryPath === localPath) {
                return config;
            }
            for (const file of config.files) {
                const filePath = this.fileSystemManager.getLocalPathForFile(config, file);
                const f = this.fileSystemManager.getFileForFile(config, file);
                if (filePath === localPath || f.uri === localPath) {
                    return config;
                }
            }
        }

        return null;
    }

    /** All configs resolved for the given app language (one per capability); delegates to config resolver. */
    public async getResolvedConfigs(appLanguage?: string): Promise<Record<string, SelectedVariant>> {
        return this.configResolver.getResolvedConfigs(appLanguage);
    }

    public getProgress(capability: string): number {
        return this.sessionManager.getProgress(capability);
    }

    public async getTotalSize(appLanguage?: string): Promise<number> {
        const resolved = await this.configResolver.getResolvedConfigs(appLanguage);
        return this.fileSystemManager.getTotalSize(Object.values(resolved));
    }

    private async startDownload(session: DownloadSession): Promise<void> {
        try {
            // Update session state
            this.sessionManager.updateSessionState(session.capability, 'downloading');

            // Download the model with progress tracking
            await this.fileDownloader.downloadModel(session.config, (progress) => {
                this.sessionManager.updateSessionProgress(session.capability, progress);
            });

            // Mark as completed
            this.sessionManager.updateSessionState(session.capability, 'completed');
            this.sessionManager.updateSessionProgress(session.capability, 1);

            this.logger.info(`Download completed for ${session.capability}`);
        } catch (error) {
            this.sessionManager.updateSessionError(session.capability, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
}
