/**
 * Checks for newer model configurations and manages version state.
 */

import semver from 'semver';
import type { ModelConfig } from '@/Api';
import { type InferenceModelConfigProvider, inferenceModelConfigProvider } from './InferenceModelConfigProvider';
import { ModelArtifactStorage } from './InferenceModelDownload/ModelArtifactStorage';
import type { LoggerInterface } from './Logger';
import { appLogger } from './Logger';

/** Information about available updates */
export interface UpdateInfo {
    capability: string;
    currentVersion: string;
    availableVersion: string;
    sizeBytes: number;
}

/** Result of checking for updates */
export interface UpdateCheckResult {
    hasUpdates: boolean;
    updates: UpdateInfo[];
    totalSizeBytes: number;
}

export class InferenceModelVersionManager {
    public constructor(
        private readonly logger: LoggerInterface,
        private readonly configProvider: InferenceModelConfigProvider,
        private readonly artifactStorage: ModelArtifactStorage,
    ) {}

    /**
     * Check for updates for all models or specific capabilities
     */
    public async checkForUpdates(capabilities?: string[]): Promise<UpdateCheckResult> {
        this.logger.debug('Checking for model updates', { capabilities });

        // Get current local configurations
        const localConfigs = await this.getLocalConfigs();

        // Get remote configurations
        const remoteConfigs = await this.configProvider.getConfigs();

        const updates: UpdateInfo[] = [];
        let totalSizeBytes = 0;

        // Determine which capabilities to check
        const capabilitiesToCheck = capabilities ?? Object.keys(localConfigs);

        for (const capability of capabilitiesToCheck) {
            const localConfig = localConfigs[capability];
            const remoteConfig = remoteConfigs[capability];

            if (!remoteConfig) {
                this.logger.warn(`No remote configuration found for capability: ${capability}`);
                continue;
            }

            // If no local version exists, this is not an update but a new download
            if (!localConfig) {
                continue;
            }

            // Compare versions (simplified - in reality would parse semantic versioning)
            if (this.isNewerVersion(remoteConfig.version, localConfig.version)) {
                // Calculate size from files in the config
                const updateSize = this.calculateConfigSize(remoteConfig);

                updates.push({
                    capability,
                    currentVersion: localConfig.version,
                    availableVersion: remoteConfig.version,
                    sizeBytes: updateSize,
                });

                totalSizeBytes += updateSize;
            }
        }

        return {
            hasUpdates: updates.length > 0,
            updates,
            totalSizeBytes,
        };
    }

    public static createDefaultInstance(): InferenceModelVersionManager {
        const logger = appLogger;
        const configProvider = inferenceModelConfigProvider;
        const artifactStorage = new ModelArtifactStorage(logger);

        return new InferenceModelVersionManager(logger, configProvider, artifactStorage);
    }

    /**
     * Update a specific model to the latest version
     */
    public async update(capability: string): Promise<void> {
        this.logger.info(`Updating model: ${capability}`);

        // Get current local configuration
        const localConfigs = await this.getLocalConfigs();
        const localConfig = localConfigs[capability];

        if (!localConfig) {
            throw new Error(`No local model found for capability: ${capability}`);
        }

        // Get remote configuration
        const remoteConfig = await this.configProvider.getConfig(capability);

        if (!this.isNewerVersion(remoteConfig.version, localConfig.version)) {
            this.logger.info(`Model ${capability} is already at latest version`);
            return;
        }

        // Delete old version
        await this.artifactStorage.deleteModelConfig(localConfig);

        // The actual download will be handled by the InferenceModelDownloader
        // This method just prepares for the update
        this.logger.debug(
            `Model ${capability} marked for update from ${localConfig.version} to ${remoteConfig.version}`,
        );
    }

    /**
     * Calculate the total size of all files in a model configuration
     */
    private calculateConfigSize(config: ModelConfig): number {
        if (!config.files || config.files.length === 0) {
            return 0;
        }

        // Sum up the size of all files
        return config.files.reduce((total, file) => {
            return total + (file.sizeBytes || 0);
        }, 0);
    }

    /**
     * Get all locally installed model configurations
     */
    private async getLocalConfigs(): Promise<Record<string, ModelConfig>> {
        // This is a simplified implementation
        // In a real implementation, we would scan the file system for downloaded models
        // For now, we return an empty object as a placeholder
        return {};
    }

    /**
     * Compare two version strings to determine if remote is newer than local
     */
    private isNewerVersion(remoteVersion: string, localVersion: string): boolean {
        // Use semver to properly compare versions
        return semver.gt(remoteVersion, localVersion);
    }
}

// Export a default manager wired with production dependencies. Tests may
// instantiate separate instances when they need to isolate behavior.
export const inferenceModelVersionManager = InferenceModelVersionManager.createDefaultInstance();
