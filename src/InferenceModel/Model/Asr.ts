import { z } from 'zod';
import type { AppLogger } from '@/Core/AppLogger';
import { AsrException } from '@/Exception';
import { PcmSampleConverter } from '@/Math';
import { AsrVocabulary, TdtGreedyDecoder, TdtGreedyDecoderOptions } from '../Asr';
import type { Downloader } from '../Downloader';
import type { ExecuTorchRuntime } from '../ExecuTorch';
import { ExecuTorchRunInput, FixedWindow } from '../ExecuTorch';
import { LogMelSpectrogramOptions } from '../Spectrogram';
import type { MelSpectrogramExtractorInterface } from '../Spectrogram';
import { AbstractModel } from './AbstractModel';
import type { InferenceModel } from './InferenceModel';

interface AsrPipeline {
    readonly vocabulary: AsrVocabulary;
    readonly decoder: TdtGreedyDecoder;
}

/**
 * Asr – Parakeet-TDT ASR over three frozen ExecuTorch programs
 * (encoder+projector, decoder step, joint) plus the SentencePiece
 * vocabulary shipped in the model bundle. The mel front-end runs in the
 * native MelSpectrogram module, parity-validated against the JS oracle
 * (SpectrogramParity) — the JS AsrMelSpectrogram stays as the oracle only.
 *
 * Design: audio capture, VAD segmentation and decryption are handled upstream;
 * this class sees decrypted PCM samples only.
 */
export class Asr extends AbstractModel implements InferenceModel {
    public static readonly CAPABILITY = 'asr';
    public static readonly VOCABULARY_SCHEMA = z.array(z.string());
    public static readonly NUM_MELS = LogMelSpectrogramOptions.DEFAULT_BAND_COUNT;
    public static readonly FIXED_MEL_FRAMES = 2800;
    public static readonly ENCODER_FRAME_SIZE = 640;
    public static readonly HIDDEN_STATE_SIZE = 1280;
    private static readonly LOG_MEL_OPTIONS = LogMelSpectrogramOptions.create();

    private readonly decoderStep = (tokenId: number): Float32Array => {
        const outputs = this.bundle.runProgram('decoder', [
            ExecuTorchRunInput.create(BigInt64Array.from([BigInt(tokenId)]), [1, 1]),
            ExecuTorchRunInput.create(this.decoderHiddenState, [2, 1, Asr.ENCODER_FRAME_SIZE]),
            ExecuTorchRunInput.create(this.decoderCellState, [2, 1, Asr.ENCODER_FRAME_SIZE]),
        ]);
        this.decoderHiddenState = outputs[1];
        this.decoderCellState = outputs[2];

        return outputs[0];
    };

    private readonly jointLogits = (predState: Float32Array, encoderFrame: Float32Array): Float32Array => {
        const outputs = this.bundle.runProgram('joint', [
            ExecuTorchRunInput.create(predState.subarray(0, Asr.ENCODER_FRAME_SIZE), [1, 1, Asr.ENCODER_FRAME_SIZE]),
            ExecuTorchRunInput.create(encoderFrame, [1, 1, Asr.ENCODER_FRAME_SIZE]),
        ]);

        return outputs[0];
    };

    private pipeline: AsrPipeline | null = null;
    private decoderHiddenState: Float32Array = new Float32Array(0);
    private decoderCellState: Float32Array = new Float32Array(0);

    public constructor(
        downloader: Downloader,
        executorch: ExecuTorchRuntime,
        logger: AppLogger,
        private readonly extractor: MelSpectrogramExtractorInterface,
        private readonly sampleConverter: PcmSampleConverter,
    ) {
        super(Asr.CAPABILITY, downloader, executorch, logger);
    }

    public async run(samples: Float32Array): Promise<string> {
        const pipeline = this.pipeline;
        if (pipeline == null) {
            throw new AsrException('Asr model not initialized. Call initialize() first.');
        }

        const pcm16 = this.sampleConverter.float32ToInt16(samples);
        const spectrogram = await this.extractor.extractLogMelSpectrogram(pcm16, Asr.LOG_MEL_OPTIONS);
        const window = FixedWindow.create(spectrogram.values, Asr.FIXED_MEL_FRAMES * Asr.NUM_MELS);
        const encoded = this.bundle.runProgram('encoder', [
            ExecuTorchRunInput.create(window, [1, Asr.FIXED_MEL_FRAMES, Asr.NUM_MELS]),
        ]);
        this.decoderHiddenState = new Float32Array(Asr.HIDDEN_STATE_SIZE);
        this.decoderCellState = new Float32Array(Asr.HIDDEN_STATE_SIZE);
        const decoded = pipeline.decoder.decode(encoded[0]);

        return pipeline.vocabulary.decode(decoded.tokenIds);
    }

    protected async loadBundle(): Promise<void> {
        await this.bundle.loadProgram('encoder');
        await this.bundle.loadProgram('decoder');
        await this.bundle.loadProgram('joint');
        this.pipeline = {
            vocabulary: await this.loadVocabulary(),
            decoder: this.buildDecoder(),
        };
    }

    protected releaseBundle(): void {
        this.pipeline = null;
    }

    private loadVocabulary(): Promise<AsrVocabulary> {
        return this.readJsonArtifact('tokenizer', 'vocabulary', Asr.VOCABULARY_SCHEMA).then(
            (pieces) => new AsrVocabulary(pieces),
        );
    }

    private async readJsonArtifact<T>(role: 'tokenizer', label: string, schema: z.ZodType<T>): Promise<T> {
        const text = await this.bundle.readText(role, label);

        return schema.parse(JSON.parse(text));
    }

    private buildDecoder(): TdtGreedyDecoder {
        return new TdtGreedyDecoder(TdtGreedyDecoderOptions.create(this.jointLogits, this.decoderStep));
    }
}
