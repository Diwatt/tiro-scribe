import type { AppLogger } from '@/Core/AppLogger';
import { VadException } from '@/Exception';
import type { InferenceModelFileRole } from '../Download/ModelArtifactStorage';
import type { Downloader } from '../Downloader';
import type { ExecuTorchRuntime } from '../ExecuTorch';
import { ExecuTorchRunInput } from '../ExecuTorch';
import { AbstractModel } from './AbstractModel';
import type { InferenceModel } from './InferenceModel';
import { VadConfig } from './VadConfig';

/**
 * Vad – Silero VAD v5 speech activity detection over a frozen ExecuTorch program.
 *
 * The program is stateful: each call feeds the recurrent state forward and
 * returns the updated state alongside the speech probability. The state lives
 * in this class; reset() must be called when starting a new audio stream so a
 * previous session cannot leak into the next one.
 */
export class Vad extends AbstractModel implements InferenceModel {
    public static readonly CAPABILITY = 'vad';
    private static readonly ENCODER_FILE_ROLE: InferenceModelFileRole = 'encoder';
    private static readonly CONFIG_FILE_ROLE: InferenceModelFileRole = 'config';
    private static readonly STATE_BATCH = 2;
    private static readonly STATE_BATCHES = 1;

    private config: VadConfig | null = null;
    private hiddenState: Float32Array = new Float32Array(0);

    public constructor(
        downloader: Downloader,
        executorch: ExecuTorchRuntime,
        logger: AppLogger,
    ) {
        super(Vad.CAPABILITY, downloader, executorch, logger);
    }

    /**
     * Speech probability for one window of PCM samples.
     * @param pcmChunk - Mono PCM float samples, exactly windowSamples long
     * @returns Speech probability in [0, 1]
     */
    public async run(pcmChunk: Float32Array): Promise<number> {
        try {
            const config = this.getConfig();
            if (pcmChunk.length !== config.windowSamples) {
                throw new VadException(
                    `VAD expects ${config.windowSamples} samples per window, got ${pcmChunk.length}`,
                );
            }

            const stateShape = [Vad.STATE_BATCH, Vad.STATE_BATCHES, config.hiddenSize];
            const outputs = this.bundle.runProgram(Vad.ENCODER_FILE_ROLE, [
                ExecuTorchRunInput.create(pcmChunk, [1, config.windowSamples]),
                ExecuTorchRunInput.create(this.hiddenState, stateShape),
            ]);

            this.hiddenState = outputs[1];
            return outputs[0][0];
        } catch (error) {
            this.logger.error('[Vad] Inference failed', { error });
            throw error;
        }
    }

    /**
     * Clear the recurrent state before analysing a new audio stream.
     */
    public reset(): void {
        const config = this.getConfig();
        this.hiddenState = new Float32Array(Vad.STATE_BATCH * Vad.STATE_BATCHES * config.hiddenSize);
    }

    /**
     * Validated model parameters, available after initialize().
     * @throws {VadException} If the model is not initialized yet
     */
    public getConfig(): VadConfig {
        if (this.config == null) {
            throw new VadException('VAD model not initialized. Call initialize() first.');
        }

        return this.config;
    }

    protected async loadBundle(): Promise<void> {
        this.config = await this.loadConfig();
        this.hiddenState = new Float32Array(Vad.STATE_BATCH * Vad.STATE_BATCHES * this.config.hiddenSize);
        await this.bundle.loadProgram(Vad.ENCODER_FILE_ROLE);
    }

    protected releaseBundle(): void {
        this.config = null;
        this.hiddenState = new Float32Array(0);
    }

    private async loadConfig(): Promise<VadConfig> {
        const yamlText = await this.bundle.readText(Vad.CONFIG_FILE_ROLE, 'Config');
        const config = VadConfig.fromYamlText(yamlText);
        this.logger.debug('[Vad] Config loaded', {
            sampleRateHz: config.sampleRateHz,
            windowSamples: config.windowSamples,
            hiddenSize: config.hiddenSize,
        });

        return config;
    }
}
