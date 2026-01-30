/**
 * ModelDownloader - Downloads ONNX models on first app launch
 * 
 * Models are downloaded from a CDN/server and cached locally
 */

import * as FileSystem from 'expo-file-system/legacy';
import {AppLogger, LoggerInterface} from './Logger';
import {ModelDownloadError} from '../Exception/ModelDownloadError';

export interface ModelConfig {
    name: string;
    url: string;
    localPath: string;
    checksum?: string; // Optional SHA-256 checksum for verification
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
    SPEAKER_RECOGNITION: {
        name: 'speaker-recognition',
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recognition-models/3dspeaker_speechbrain.zipformer.onnx',
        localPath: 'models/speaker-recognition.onnx',
    },
    BERT_NER: {
        name: 'bert-ner',
        url: 'https://your-cdn.com/models/bert-ner-quantized.onnx', // Update with your model URL
        localPath: 'models/bert-ner-quantized.onnx',
    },
    // Add more models as needed
};

export class ModelDownloader {
    private static downloadProgress: Map<string, number> = new Map();
    private static loggerInstance: LoggerInterface = AppLogger.getInstance();

    /**
     * Download a model if it doesn't exist locally
     * @param config - Model configuration
     * @param onProgress - Optional progress callback (0-1)
     * @returns Local file path
     */
    static async ensureModelDownloaded(
        config: ModelConfig,
        onProgress?: (progress: number) => void,
    ): Promise<string> {
        const localPath = `${FileSystem.documentDirectory}${config.localPath}`;
        
        // Check if model already exists
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
            ModelDownloader.loggerInstance.debug(`Model ${config.name} already exists at ${localPath}`);
            return localPath;
        }

        // Create models directory if it doesn't exist
        const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));
        const dirInfo = await FileSystem.getInfoAsync(dirPath);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dirPath, {intermediates: true});
        }

        // Download the model
        ModelDownloader.loggerInstance.info(`Downloading model ${config.name} from ${config.url}...`);
        
        const downloadResumable = FileSystem.createDownloadResumable(
            config.url,
            localPath,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                this.downloadProgress.set(config.name, progress);
                if (onProgress) {
                    onProgress(progress);
                }
            },
        );

        try {
            const result = await downloadResumable.downloadAsync();
            if (!result) {
                throw new ModelDownloadError('Download failed - no result');
            }

            // Verify checksum if provided
            if (config.checksum) {
                await this.verifyChecksum(localPath, config.checksum);
            }

            ModelDownloader.loggerInstance.info(`Model ${config.name} downloaded successfully to ${localPath}`);
            return localPath;
        } catch (error) {
            // Clean up partial download on error
            const fileInfo = await FileSystem.getInfoAsync(localPath);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(localPath, {idempotent: true});
            }
            throw new ModelDownloadError(
                `Failed to download model ${config.name}: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /**
     * Download multiple models in parallel
     */
    static async ensureModelsDownloaded(
        configs: ModelConfig[],
        onProgress?: (modelName: string, progress: number) => void,
    ): Promise<Record<string, string>> {
        const results: Record<string, string> = {};

        await Promise.all(
            configs.map(async (config) => {
                const path = await this.ensureModelDownloaded(
                    config,
                    onProgress
                        ? (progress) => onProgress(config.name, progress)
                        : undefined,
                );
                results[config.name] = path;
            }),
        );

        return results;
    }

    /**
     * Verify file checksum (SHA-256)
     */
    private static async verifyChecksum(
        filePath: string,
        expectedChecksum: string,
    ): Promise<void> {
        // TODO: Implement SHA-256 checksum verification
        // For now, this is a placeholder
        ModelDownloader.loggerInstance.warn('Checksum verification not implemented');
    }

    /**
     * Get download progress for a model
     */
    static getProgress(modelName: string): number {
        return this.downloadProgress.get(modelName) || 0;
    }

    /**
     * Check if model exists locally
     */
    static async modelExists(config: ModelConfig): Promise<boolean> {
        const localPath = `${FileSystem.documentDirectory}${config.localPath}`;
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        return fileInfo.exists;
    }

    /**
     * Delete a downloaded model
     */
    static async deleteModel(config: ModelConfig): Promise<void> {
        const localPath = `${FileSystem.documentDirectory}${config.localPath}`;
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(localPath, {idempotent: true});
            ModelDownloader.loggerInstance.debug(`Deleted model ${config.name} from ${localPath}`);
        }
    }

    /**
     * Get total size of all downloaded models
     */
    static async getTotalModelSize(): Promise<number> {
        let totalSize = 0;
        
        for (const config of Object.values(MODEL_CONFIGS)) {
            const localPath = `${FileSystem.documentDirectory}${config.localPath}`;
            const fileInfo = await FileSystem.getInfoAsync(localPath);
            if (fileInfo.exists && 'size' in fileInfo) {
                totalSize += fileInfo.size;
            }
        }
        
        return totalSize;
    }
}
