/**
 * ModelArtifactStorage – Manages file system operations for inference model artifacts.
 *
 * Single Responsibility: Handle storage, retrieval, and management of model artifacts
 * including path resolution, directory creation, file operations, and cache management.
 *
 * This class provides a clean abstraction over the file system for model artifacts,
 * ensuring consistent path resolution and proper error handling.
 */

import { Directory, File, Paths } from 'expo-file-system';
import type { InferenceModelFile, ModelConfig } from '@/Api';
import { AppConfig } from '@/Config';
import { InferenceModelDownloaderException } from '@/Exception';
import type { LoggerInterface } from '@/Service/Logger';
import { AppLogger } from '@/Service/Logger';

export class ModelArtifactStorage {
    public constructor(
        private readonly logger: LoggerInterface = AppLogger.getInstance(),
        private readonly appConfig: AppConfig = AppConfig.getInstance(),
    ) {}

    /**
     * Calculates the total size of all cached model artifacts.
     *
     * @param configs - Array of model configurations to calculate size for
     * @returns Total size in bytes of all cached artifacts
     */
    public async calculateTotalSize(configs: ModelConfig[]): Promise<number> {
        let totalSize = 0;
        for (const config of configs) {
            for (const file of config.files) {
                const artifactFile = this.getFile(config, file);
                if (artifactFile.exists) {
                    totalSize += artifactFile.size;
                }
            }
        }

        return totalSize;
    }

    /**
     * Deletes all artifact files for a model configuration.
     *
     * @param config - The model configuration to delete
     * @throws {Error} If file deletion fails
     */
    public async deleteModelConfig(config: ModelConfig): Promise<void> {
        const configDir = new Directory(Paths.document, this.appConfig.artifactStorageDirName, config.id);
        if (configDir.exists) {
            for (const file of config.files) {
                const artifactFile = this.getFile(config, file);
                if (artifactFile.exists) {
                    artifactFile.delete();
                }
            }
            this.logger.debug(`Deleted model artifacts for ${config.capability} (${config.id})`);
        }
    }

    /**
     * Ensures that storage directories exist for a model configuration.
     * Creates the artifact storage directory and configuration-specific directory if they don't exist.
     *
     * @param config - The model configuration
     */
    public async ensureDirectories(config: ModelConfig): Promise<void> {
        const subdir = this.appConfig.artifactStorageDirName;
        const modelsDir = new Directory(Paths.document, subdir);
        if (!modelsDir.exists) {
            modelsDir.create({ intermediates: true, idempotent: true });
            this.logger.debug(`Created artifact storage directory: ${modelsDir.uri}`);
        }

        const configDir = new Directory(Paths.document, subdir, config.id);
        if (!configDir.exists) {
            configDir.create({ intermediates: true, idempotent: true });
            this.logger.debug(`Created model config directory: ${configDir.uri}`);
        }
    }

    /**
     * Gets a File object for a specific model artifact.
     *
     * @param config - The model configuration
     * @param file - The artifact file metadata
     * @returns A File object representing the artifact on the file system
     */
    public getFile(config: ModelConfig, file: InferenceModelFile): File {
        const filename = this.extractFilenameFromUrl(file.url);

        // Defensive check to ensure all path components are defined
        if (!config.id) {
            throw new InferenceModelDownloaderException(
                `Model configuration for capability '${config.capability}' has no id. This may indicate an API response issue.`,
            );
        }

        if (!filename) {
            throw new InferenceModelDownloaderException(
                `Failed to extract filename from URL '${file.url}' for capability '${config.capability}'`,
            );
        }

        return new File(Paths.document, this.appConfig.artifactStorageDirName, config.id, filename);
    }

    /**
     * Gets the URI of the ONNX model file from a model configuration.
     * Looks for a file with .onnx extension; falls back to the first file if none found.
     *
     * @param config - The model configuration
     * @returns The URI of the ONNX model file (or first file as fallback)
     * @throws {InferenceModelDownloaderException} If the configuration has no files
     */
    public getModelUri(config: ModelConfig): string {
        if (config.files.length === 0) {
            throw new InferenceModelDownloaderException(
                `Model configuration ${config.capability} (${config.id}) has no files`,
            );
        }

        // Try to find a file with .onnx extension
        for (const file of config.files) {
            const filename = this.extractFilenameFromUrl(file.url);
            if (filename.toLowerCase().endsWith('.onnx')) {
                const onnxFile = this.getFile(config, file);
                return onnxFile.uri;
            }
        }

        // Fallback to first file
        const firstFile = this.getFile(config, config.files[0]);
        return firstFile.uri;
    }

    /**
     * Gets the URI for a specific model artifact.
     *
     * @param config - The model configuration
     * @param file - The artifact file metadata
     * @returns The full URI to the artifact file
     */
    public getUri(config: ModelConfig, file: InferenceModelFile): string {
        return this.getFile(config, file).uri;
    }

    /**
     * Checks if all files for a model configuration have been downloaded.
     *
     * @param config - The model configuration
     * @returns True if all artifact files exist on the file system
     * @throws {InferenceModelDownloaderException} If the configuration has no files
     */
    public hasAllFiles(config: ModelConfig): boolean {
        if (config.files.length === 0) {
            throw new InferenceModelDownloaderException(
                `Model configuration ${config.capability} (${config.id}) has no files`,
            );
        }

        // Check if all files exist
        for (const file of config.files) {
            if (!this.getFile(config, file).exists) {
                return false;
            }
        }
        return true;
    }

    /**
     * Resolves the local file system path for a specific model artifact.
     * The path is relative to the document directory.
     *
     * @param config - The model configuration
     * @param artifactFile - The artifact file metadata
     * @returns The local file system path (e.g., "artifacts/{configId}/{filename}")
     */
    public resolvePath(config: ModelConfig, file: InferenceModelFile): string {
        return `${this.appConfig.artifactStorageDirName}/${config.id}/${this.extractFilenameFromUrl(file.url)}`;
    }

    /**
     * Extracts filename from a URL.
     * @private
     * @throws {InferenceModelDownloaderException} If the URL is invalid or doesn't contain a filename
     */
    private extractFilenameFromUrl(url: string): string {
        try {
            // grab last segment of pathname; simple and works in runtime
            const pathname = new URL(url).pathname;
            let filename = pathname.substring(pathname.lastIndexOf('/') + 1);
            if (!filename) {
                throw new InferenceModelDownloaderException(`URL "${url}" does not contain a filename`);
            }
            // Decode percent‑encoded characters (e.g. %2B → +) so the local file
            // name matches what a browser would download.  Expo's File API has
            // trouble with encoded or exotic names and may throw
            // "file doesn't exist" errors when trying to open or write to them.
            try {
                filename = decodeURIComponent(filename);
            } catch {
                // if decoding fails for some reason, just keep the raw name
            }

            return filename;
        } catch (error) {
            if (error instanceof Error) {
                throw new InferenceModelDownloaderException(
                    `Failed to extract filename from URL "${url}": ${error.message}`,
                    error,
                );
            }
            throw new InferenceModelDownloaderException(`Failed to extract filename from URL "${url}"`);
        }
    }
}
