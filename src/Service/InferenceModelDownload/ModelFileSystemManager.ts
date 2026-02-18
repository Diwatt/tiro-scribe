/**
 * ModelFileSystemManager – Handles file system operations for model files.
 * Single Responsibility: File system operations and path resolution.
 */

import type { InferenceModelFile, SelectedVariant } from '@/Api';
import { AppConfig } from '@/Config';
import { Directory, File, Paths } from 'expo-file-system';
import { AppLogger, type LoggerInterface } from '@/Service/Logger';

function getFilenameFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);
        return segments[segments.length - 1] ?? 'file';
    } catch {
        return 'file';
    }
}

export class ModelFileSystemManager {
    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {}

    /** Path to a specific file in the variant. Relative under document dir. */
    public getLocalPathForFile(config: SelectedVariant, file: InferenceModelFile): string {
        return `${AppConfig.artifactStorageDirName}/${config.id}/${getFilenameFromUrl(file.url)}`;
    }

    /** Get File object for a specific file. */
    public getFileForFile(config: SelectedVariant, file: InferenceModelFile): File {
        const filename = getFilenameFromUrl(file.url);
        return new File(Paths.document, AppConfig.artifactStorageDirName, config.id, filename);
    }

    /** Delete all files for a model variant. */
    public async delete(config: SelectedVariant): Promise<void> {
        const variantDir = new Directory(Paths.document, AppConfig.artifactStorageDirName, config.id);
        if (variantDir.exists) {
            for (const file of config.files) {
                const f = this.getFileForFile(config, file);
                if (f.exists) {
                    f.delete();
                }
            }
            this.logger.debug(`Deleted model ${config.capability} (${config.id})`);
        }
    }

    /** Get total size of all cached model files. */
    public async getTotalSize(configs: SelectedVariant[]): Promise<number> {
        let totalSize = 0;
        for (const config of configs) {
            for (const file of config.files) {
                const f = this.getFileForFile(config, file);
                if (f.exists) {
                    totalSize += f.size;
                }
            }
        }

        return totalSize;
    }

    /** Check if primary file for a model variant exists. */
    public primaryFileExists(config: SelectedVariant): boolean {
        const primaryFile = this.getFileForFile(config, config.files[0]);
        return primaryFile.exists;
    }

    /** Get URI of primary file for a model variant. */
    public getPrimaryFileUri(config: SelectedVariant): string {
        const primaryFile = this.getFileForFile(config, config.files[0]);
        return primaryFile.uri;
    }

    /** Ensure directories exist for a model variant. */
    public ensureDirectories(config: SelectedVariant): void {
        const subdir = AppConfig.artifactStorageDirName;
        const modelsDir = new Directory(Paths.document, subdir);
        if (!modelsDir.exists) {
            modelsDir.create({ intermediates: true, idempotent: true });
        }

        const variantDir = new Directory(Paths.document, subdir, config.id);
        if (!variantDir.exists) {
            variantDir.create({ intermediates: true, idempotent: true });
        }
    }
}
