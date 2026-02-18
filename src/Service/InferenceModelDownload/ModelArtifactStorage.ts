/**
 * ModelArtifactStorage – Manages file system operations for inference model artifacts.
 *
 * Single Responsibility: Handle storage, retrieval, and management of model artifacts
 * including path resolution, directory creation, file operations, and cache management.
 *
 * This class provides a clean abstraction over the file system for model artifacts,
 * ensuring consistent path resolution and proper error handling.
 */

import type { InferenceModelFile, SelectedVariant } from '@/Api';
import { AppConfig } from '@/Config';
import { Directory, File, Paths } from 'expo-file-system';
import { AppLogger, type LoggerInterface } from '@/Service/Logger';

/**
 * Extracts filename from a URL.
 * @private
 */
function extractFilenameFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);
        return segments[segments.length - 1] ?? 'file';
    } catch {
        return 'file';
    }
}

export class ModelArtifactStorage {
    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {}

    /**
     * Resolves the local file system path for a specific model artifact.
     * The path is relative to the document directory.
     *
     * @param variant - The model variant configuration
     * @param artifactFile - The artifact file metadata
     * @returns The local file system path (e.g., "artifacts/{variantId}/{filename}")
     */
    public resolvePath(variant: SelectedVariant, file: InferenceModelFile): string {
        return `${AppConfig.artifactStorageDirName}/${variant.id}/${extractFilenameFromUrl(file.url)}`;
    }

    /**
     * Gets a File object for a specific model artifact.
     *
     * @param variant - The model variant configuration
     * @param file - The artifact file metadata
     * @returns A File object representing the artifact on the file system
     */
    public getFile(variant: SelectedVariant, file: InferenceModelFile): File {
        const filename = extractFilenameFromUrl(file.url);
        return new File(Paths.document, AppConfig.artifactStorageDirName, variant.id, filename);
    }

    /**
     * Gets the URI for a specific model artifact.
     *
     * @param variant - The model variant configuration
     * @param file - The artifact file metadata
     * @returns The full URI to the artifact file
     */
    public getUri(variant: SelectedVariant, file: InferenceModelFile): string {
        return this.getFile(variant, file).uri;
    }

    /**
     * Checks if a specific artifact file exists.
     *
     * @param variant - The model variant configuration
     * @param file - The artifact file metadata
     * @returns True if the artifact file exists on the file system
     */
    public exists(variant: SelectedVariant, file: InferenceModelFile): boolean {
        return this.getFile(variant, file).exists;
    }

    /**
     * Deletes all artifact files for a model variant.
     *
     * @param variant - The model variant configuration to delete
     * @throws {Error} If file deletion fails
     */
    public async deleteVariant(variant: SelectedVariant): Promise<void> {
        const variantDir = new Directory(Paths.document, AppConfig.artifactStorageDirName, variant.id);
        if (variantDir.exists) {
            for (const file of variant.files) {
                const artifactFile = this.getFile(variant, file);
                if (artifactFile.exists) {
                    artifactFile.delete();
                }
            }
            this.logger.debug(`Deleted model artifacts for ${variant.capability} (${variant.id})`);
        }
    }

    /**
     * Calculates the total size of all cached model artifacts.
     *
     * @param variants - Array of model variants to calculate size for
     * @returns Total size in bytes of all cached artifacts
     */
    public async calculateTotalSize(variants: SelectedVariant[]): Promise<number> {
        let totalSize = 0;
        for (const variant of variants) {
            for (const file of variant.files) {
                const artifactFile = this.getFile(variant, file);
                if (artifactFile.exists) {
                    totalSize += artifactFile.size;
                }
            }
        }

        return totalSize;
    }

    /**
     * Checks if the primary artifact for a model variant exists.
     * The primary artifact is the first file in the variant's files array.
     *
     * @param variant - The model variant configuration
     * @returns True if the primary artifact exists
     */
    public hasPrimary(variant: SelectedVariant): boolean {
        const primaryArtifact = this.getFile(variant, variant.files[0]);
        return primaryArtifact.exists;
    }

    /**
     * Gets the URI of the primary artifact for a model variant.
     * The primary artifact is the first file in the variant's files array.
     *
     * @param variant - The model variant configuration
     * @returns The URI of the primary artifact
     */
    public getPrimaryUri(variant: SelectedVariant): string {
        const primaryArtifact = this.getFile(variant, variant.files[0]);
        return primaryArtifact.uri;
    }

    /**
     * Ensures that storage directories exist for a model variant.
     * Creates the artifact storage directory and variant-specific directory if they don't exist.
     *
     * @param variant - The model variant configuration
     */
    public ensureDirectories(variant: SelectedVariant): void {
        const subdir = AppConfig.artifactStorageDirName;
        const modelsDir = new Directory(Paths.document, subdir);
        if (!modelsDir.exists) {
            modelsDir.create({ intermediates: true, idempotent: true });
        }

        const variantDir = new Directory(Paths.document, subdir, variant.id);
        if (!variantDir.exists) {
            variantDir.create({ intermediates: true, idempotent: true });
        }
    }
}
