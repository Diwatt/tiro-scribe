/**
 * FileDownloader – Handles actual file downloading with progress tracking.
 * Single Responsibility: Download files from URLs with progress tracking.
 */

import type { InferenceModelFile, SelectedVariant } from '@/Api';
import { File } from 'expo-file-system';
import { InferenceModelDownloaderException } from '@/Exception/InferenceModelDownloaderException';
import { AppLogger, type LoggerInterface } from '@/Service/Logger';
import type { ModelFileSystemManager } from './ModelFileSystemManager';
import type { ChecksumVerifier } from './ChecksumVerifier';

export class FileDownloader {
    public constructor(
        private readonly fileSystemManager: ModelFileSystemManager,
        private readonly checksumVerifier: ChecksumVerifier,
        private readonly logger: LoggerInterface = AppLogger.getInstance(),
    ) {}

    /**
     * Download all files for a model variant with progress tracking.
     */
    public async downloadModel(config: SelectedVariant, onProgress?: (progress: number) => void): Promise<void> {
        this.logger.info(`Fetching model ${config.capability} (${config.id}) – ${config.files.length} file(s)...`);

        // Ensure directories exist
        this.fileSystemManager.ensureDirectories(config);

        const totalFiles = config.files.length;
        const progressPerFile = totalFiles > 0 ? 1 / totalFiles : 1;

        if (onProgress) {
            onProgress(0);
        }

        try {
            for (let i = 0; i < config.files.length; i++) {
                const file = config.files[i];
                const fileObj = this.fileSystemManager.getFileForFile(config, file);

                // Skip if file already exists
                if (fileObj.exists) {
                    this.logger.debug(`File already exists: ${fileObj.uri}`);
                    if (onProgress) {
                        onProgress((i + 1) * progressPerFile);
                    }
                    continue;
                }

                // Download the file
                await File.downloadFileAsync(file.url, fileObj, { idempotent: true });
                this.logger.debug(`Downloaded: ${file.url} -> ${fileObj.uri}`);

                // Verify checksum if provided
                const hash = file.hash?.trim();
                if (hash != null && hash !== '') {
                    if (onProgress) {
                        // Set verifying state (halfway through this file's progress)
                        onProgress((i + 0.5) * progressPerFile);
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

            this.logger.info(`Model ${config.capability} downloaded successfully`);
        } catch (error) {
            this.logger.error(`Failed to download model ${config.capability}:`, error);
            throw new InferenceModelDownloaderException(
                `Failed to fetch model ${config.capability}: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /**
     * Download a single file.
     */
    public async downloadSingleFile(config: SelectedVariant, file: InferenceModelFile, onProgress?: (progress: number) => void): Promise<File> {
        const fileObj = this.fileSystemManager.getFileForFile(config, file);

        if (fileObj.exists) {
            this.logger.debug(`File already exists: ${fileObj.uri}`);
            if (onProgress) {
                onProgress(1);
            }
            return fileObj;
        }

        // Ensure directories exist
        this.fileSystemManager.ensureDirectories(config);

        try {
            if (onProgress) {
                onProgress(0);
            }

            await File.downloadFileAsync(file.url, fileObj, { idempotent: true });

            if (onProgress) {
                onProgress(0.5);
            }

            // Verify checksum if provided
            const hash = file.hash?.trim();
            if (hash != null && hash !== '') {
                await this.checksumVerifier.verify(fileObj, hash);
            }

            if (onProgress) {
                onProgress(1);
            }

            this.logger.debug(`Downloaded single file: ${file.url} -> ${fileObj.uri}`);
            return fileObj;
        } catch (error) {
            this.logger.error(`Failed to download file ${file.url}:`, error);
            throw new InferenceModelDownloaderException(`Failed to download file: ${error}`, error instanceof Error ? error : new Error(String(error)));
        }
    }
}
