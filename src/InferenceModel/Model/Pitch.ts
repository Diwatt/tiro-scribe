import type { AppLogger } from '@/Core/AppLogger';
import { PitchException } from '@/Exception';
import type { InferenceModelFileRole } from '../Download/ModelArtifactStorage';
import type { Downloader } from '../Downloader';
import type { ExecuTorchRuntime } from '../ExecuTorch';
import { ExecuTorchRunInput } from '../ExecuTorch';
import { AbstractModel } from './AbstractModel';
import type { InferenceModel } from './InferenceModel';
import { PitchConfig } from './PitchConfig';
import { PitchEstimate } from './PitchEstimate';

/**
 * Pitch – CREPE fundamental frequency estimation over a frozen ExecuTorch program.
 *
 * Stateless per frame: each call turns one PCM analysis window into a pitch
 * estimate. Frames below the voiced threshold return hz = 0 so callers can
 * distinguish unvoiced frames from actual low pitches.
 */
export class Pitch extends AbstractModel implements InferenceModel {
    public static readonly CAPABILITY = 'pitch';
    private static readonly ENCODER_FILE_ROLE: InferenceModelFileRole = 'encoder';
    private static readonly CONFIG_FILE_ROLE: InferenceModelFileRole = 'config';

    private config: PitchConfig | null = null;

    public constructor(
        downloader: Downloader,
        executorch: ExecuTorchRuntime,
        logger: AppLogger,
    ) {
        super(Pitch.CAPABILITY, downloader, executorch, logger);
    }

    /**
     * Pitch estimate for one frame of PCM samples.
     * @param frame - Mono PCM float samples, exactly frameSamples long
     * @returns Pitch estimate: hz is 0 when the frame is unvoiced
     */
    public async run(frame: Float32Array): Promise<PitchEstimate> {
        try {
            const config = this.getConfig();
            if (frame.length !== config.frameSamples) {
                throw new PitchException(
                    `Pitch expects ${config.frameSamples} samples per frame, got ${frame.length}`,
                );
            }

            const outputs = this.bundle.runProgram(Pitch.ENCODER_FILE_ROLE, [
                ExecuTorchRunInput.create(frame, [1, config.frameSamples]),
            ]);

            const { binIndex, confidence } = Pitch.findPeak(outputs[0]);
            if (confidence < config.voicedThreshold) {
                return new PitchEstimate(0, confidence);
            }

            const hz = config.minFrequencyHz * Math.pow(2, (binIndex * config.centsPerBin) / 1200);
            return new PitchEstimate(hz, confidence);
        } catch (error) {
            this.logger.error('[Pitch] Inference failed', { error });
            throw error;
        }
    }

    /**
     * Validated model parameters, available after initialize().
     * @throws {PitchException} If the model is not initialized yet
     */
    public getConfig(): PitchConfig {
        if (this.config == null) {
            throw new PitchException('Pitch model not initialized. Call initialize() first.');
        }

        return this.config;
    }

    protected async loadBundle(): Promise<void> {
        this.config = await this.loadConfig();
        await this.bundle.loadProgram(Pitch.ENCODER_FILE_ROLE);
    }

    protected releaseBundle(): void {
        this.config = null;
    }

    private static findPeak(activations: Float32Array): { binIndex: number; confidence: number } {
        let binIndex = 0;
        let confidence = 0;
        for (let index = 0; index < activations.length; index += 1) {
            if (activations[index] > confidence) {
                confidence = activations[index];
                binIndex = index;
            }
        }

        return { binIndex, confidence };
    }

    private async loadConfig(): Promise<PitchConfig> {
        const yamlText = await this.bundle.readText(Pitch.CONFIG_FILE_ROLE, 'Config');
        const config = PitchConfig.fromYamlText(yamlText);
        this.logger.debug('[Pitch] Config loaded', {
            sampleRateHz: config.sampleRateHz,
            frameSamples: config.frameSamples,
            pitchBins: config.pitchBins,
        });

        return config;
    }
}
