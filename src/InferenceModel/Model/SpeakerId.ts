import type { AppLogger } from '@/Core/AppLogger';
import { SpeakerIdException } from '@/Exception';
import type { InferenceModelFileRole } from '../Download/ModelArtifactStorage';
import type { Downloader } from '../Downloader';
import type { ExecuTorchRuntime } from '../ExecuTorch';
import { ExecuTorchRunInput, FixedWindow } from '../ExecuTorch';
import { AbstractModel } from './AbstractModel';
import type { InferenceModel } from './InferenceModel';
import { SpeakerIdConfig } from './SpeakerIdConfig';

/**
 * SpeakerId – CAM++ speaker recognition over a frozen ExecuTorch program.
 *
 * Design: this class manages the model only. Audio preprocessing
 * (PCM → mel features) and embedding postprocessing (normalization,
 * biocode projection) are handled by callers.
 */
export class SpeakerId extends AbstractModel implements InferenceModel {
    public static readonly CAPABILITY = 'speaker_id';
    /** Time frames of the frozen export (P2): input is [1, FIXED_TIME_FRAMES, numMelBins]. */
    public static readonly FIXED_TIME_FRAMES = 500;
    private static readonly ENCODER_FILE_ROLE: InferenceModelFileRole = 'encoder';
    private static readonly CONFIG_FILE_ROLE: InferenceModelFileRole = 'config';

    private config: SpeakerIdConfig | null = null;

    public constructor(
        downloader: Downloader,
        executorch: ExecuTorchRuntime,
        logger: AppLogger,
    ) {
        super(SpeakerId.CAPABILITY, downloader, executorch, logger);
    }

    /**
     * Extract the speaker embedding from mel-spectrogram features.
     * @param features - Mel-spectrogram features (preprocessed by caller)
     * @returns Raw speaker embedding vector (caller normalizes to unit length)
     */
    public async run(features: Float32Array): Promise<number[]> {
        try {
            const numMelBins = this.getConfig().numMelBins;
            const buffer = FixedWindow.create(features, SpeakerId.FIXED_TIME_FRAMES * numMelBins);
            const shape = [1, SpeakerId.FIXED_TIME_FRAMES, numMelBins];
            const outputs = this.bundle.runProgram(SpeakerId.ENCODER_FILE_ROLE, [ExecuTorchRunInput.create(buffer, shape)]);

            return Array.from(outputs[0]);
        } catch (error) {
            this.logger.error('[SpeakerId] Inference failed', { error });
            throw error;
        }
    }

    /**
     * Validated model parameters, available after initialize().
     * @throws {SpeakerIdException} If the model is not initialized yet
     */
    public getConfig(): SpeakerIdConfig {
        if (this.config == null) {
            throw new SpeakerIdException('Speaker id model not initialized. Call initialize() first.');
        }

        return this.config;
    }

    protected async loadBundle(): Promise<void> {
        this.config = await this.loadConfig();
        await this.bundle.loadProgram(SpeakerId.ENCODER_FILE_ROLE);
    }

    protected releaseBundle(): void {
        this.config = null;
    }

    private async loadConfig(): Promise<SpeakerIdConfig> {
        const yamlText = await this.bundle.readText(SpeakerId.CONFIG_FILE_ROLE, 'Config');

        const config = SpeakerIdConfig.fromYamlText(yamlText);
        this.logger.debug('[SpeakerId] Config loaded', {
            embeddingDim: config.embeddingDim,
            numMelBins: config.numMelBins,
            sampleRateHz: config.sampleRateHz,
        });

        return config;
    }
}
