import { Asr } from '@/InferenceModel/Model/Asr';
import { ExecuTorchRuntime } from '@/InferenceModel/ExecuTorch/ExecuTorchRuntime';
import {
    ExecuTorchDimension,
    ExecuTorchProgram,
    ExecuTorchParameter,
} from '@/InferenceModel/ExecuTorch';
import type {
    ExecuTorchBackend,
    ExecuTorchDType,
    ExecuTorchTensor,
} from '@/InferenceModel/ExecuTorch';
import type { Downloader } from '@/InferenceModel/Downloader';
import { ModelArtifact } from '@/InferenceModel/Download/ModelArtifact';
import { AsrMelSpectrogram } from '@/InferenceModel/Asr';
import { AsrException } from '@/Exception';
import type { AppLogger } from '@/Core/AppLogger';
import type { File } from 'expo-file-system';

const VOCABULARY_PIECES = [
    '<pad>', '<unk>', '<s>', '</s>', ' ', '<mask>', '[BLANK]', '<bos>', '<eos>', '<unk2>', '<pad2>', '<del>',
    '▁Atomes', '▁et', '▁matière', '.',
];
const EMITTED_TOKENS = [12, 13, 14, 15];
const BLANK = 8192;
const VOCAB_SIZE = 8193;
const FIXED_MEL_FRAMES = 2800;
const ENCODER_FRAMES = 350;
const ENCODER_FRAME_SIZE = 640;
const HIDDEN_STATE_SIZE = 1280;

const constantDims = (shape: readonly number[]) => shape.map((value) => ExecuTorchDimension.constant(value));
const floatTensor = (shape: readonly number[]) => ExecuTorchParameter.tensor('float32', constantDims(shape));

const zeroMelFilters = (): number[][] => Array.from({ length: 128 }, () => new Array<number>(257).fill(0));

const makeSignal = (sampleCount: number): Float32Array => {
    const samples = new Float32Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
        samples[index] = Math.sin(index / 100);
    }
    return samples;
};

class FakeTensor implements ExecuTorchTensor {
    public readonly data: Float32Array | BigInt64Array;

    public constructor(
        dtype: ExecuTorchDType,
        public readonly shape: readonly number[],
        source?: Float32Array | BigInt64Array,
    ) {
        const elements = shape.reduce((product, size) => product * size, 1);
        if (source != null) {
            this.data = source;
        } else {
            this.data = dtype === 'int64' ? new BigInt64Array(elements) : new Float32Array(elements);
        }
    }

    public getData(destination: Float32Array | BigInt64Array): Float32Array | BigInt64Array {
        if (this.data.length !== destination.length) {
            throw new Error(`getData overflow: tensor ${JSON.stringify(this.shape)} (${this.data.length}) into ${destination.length}`);
        }
        if (this.data instanceof BigInt64Array && destination instanceof BigInt64Array) {
            destination.set(this.data);
        } else if (this.data instanceof Float32Array && destination instanceof Float32Array) {
            destination.set(this.data);
        }
        return destination;
    }

    public setData(source: Float32Array | BigInt64Array): void {
        if (this.data.length !== source.length) {
            throw new Error(`setData overflow: tensor ${JSON.stringify(this.shape)} (${this.data.length}) received ${source.length}`);
        }
        if (this.data instanceof BigInt64Array && source instanceof BigInt64Array) {
            this.data.set(source);
        } else if (this.data instanceof Float32Array && source instanceof Float32Array) {
            this.data.set(source);
        }
    }

    public dispose(): void {}
}

class FakeBackend implements ExecuTorchBackend {
    public readonly models = new Map<string, ExecuTorchProgram>();

    public async loadProgram(path: string): Promise<ExecuTorchProgram> {
        const model = this.models.get(path);
        if (model == null) {
            throw new Error(`fake model not registered at '${path}'`);
        }
        return model;
    }

    public createTensor(dtype: ExecuTorchDType, shape: readonly number[], source?: Float32Array | BigInt64Array): ExecuTorchTensor {
        return new FakeTensor(dtype, shape, source);
    }
}

const makeEncoderModel = (onInput: (data: Float32Array) => void, onDispose: () => void): ExecuTorchProgram =>
    new ExecuTorchProgram(
        '/bundle/encoder.pte',
        new Map([['forward', [floatTensor([ENCODER_FRAMES, ENCODER_FRAME_SIZE])]]]),
        (_methodName: string, inputs: readonly ExecuTorchTensor[], outputTensors: readonly ExecuTorchTensor[]) => {
            onInput((inputs[0] as FakeTensor).data as Float32Array);
            (outputTensors[0] as FakeTensor).setData(new Float32Array(ENCODER_FRAMES * ENCODER_FRAME_SIZE));
        },
        onDispose,
    );

const makeDecoderStepModel = (onDispose: () => void): ExecuTorchProgram =>
    new ExecuTorchProgram(
        '/bundle/decoder.pte',
        new Map([
            [
                'forward',
                [floatTensor([1, 1, 640]), floatTensor([2, 1, 640]), floatTensor([2, 1, 640])],
            ],
        ]),
        (_methodName: string, _inputs: readonly ExecuTorchTensor[], outputTensors: readonly ExecuTorchTensor[]) => {
            (outputTensors[0] as FakeTensor).setData(new Float32Array(640));
            (outputTensors[1] as FakeTensor).setData(new Float32Array(HIDDEN_STATE_SIZE));
            (outputTensors[2] as FakeTensor).setData(new Float32Array(HIDDEN_STATE_SIZE));
        },
        onDispose,
    );

const makeJointModel = (onDispose: () => void): ExecuTorchProgram => {
    let calls = 0;
    return new ExecuTorchProgram(
        '/bundle/joint.pte',
        new Map([
            [
                'forward',
                [floatTensor([1, VOCAB_SIZE + 5])],
            ],
        ]),
        (_methodName: string, _inputs: readonly ExecuTorchTensor[], outputTensors: readonly ExecuTorchTensor[]) => {
            const emitted = calls < EMITTED_TOKENS.length;
            const step = emitted ? { tokenId: EMITTED_TOKENS[calls], duration: 0 } : { tokenId: BLANK, duration: 1 };
            calls += 1;
            const logits = new Float32Array(VOCAB_SIZE + 5).fill(-12);
            logits[step.tokenId] = 12;
            logits[VOCAB_SIZE + step.duration] = 12;
            (outputTensors[0] as FakeTensor).setData(logits);
        },
        onDispose,
    );
};

const makeArtifact = (text: string | null, uri = '/bundle/artifact'): ModelArtifact =>
    new ModelArtifact({ exists: text != null, text: async () => text ?? '' } as unknown as File, uri);

interface RecognizerHarness {
    readonly recognizer: Asr;
    readonly backend: FakeBackend;
    readonly downloader: { ensureDownloaded: jest.Mock; getArtifact: jest.Mock };
    readonly encoderInputs: Float32Array[];
    readonly disposedPaths: string[];
}

const createHarness = (artifacts: { tokenizerText?: string | null; melFiltersText?: string | null } = {}): RecognizerHarness => {
    const encoderInputs: Float32Array[] = [];
    const disposedPaths: string[] = [];
    const trackDispose = (path: string): void => {
        disposedPaths.push(path);
    };
    const backend = new FakeBackend();
    backend.models.set('/bundle/encoder.pte', makeEncoderModel((data) => encoderInputs.push(data), () => trackDispose('/bundle/encoder.pte')));
    backend.models.set('/bundle/decoder.pte', makeDecoderStepModel(() => trackDispose('/bundle/decoder.pte')));
    backend.models.set('/bundle/joint.pte', makeJointModel(() => trackDispose('/bundle/joint.pte')));

    const tokenizerText = artifacts.tokenizerText === undefined ? JSON.stringify(VOCABULARY_PIECES) : artifacts.tokenizerText;
    const melFiltersText = artifacts.melFiltersText === undefined ? JSON.stringify({ rows: 128, cols: 257, data: zeroMelFilters() }) : artifacts.melFiltersText;

    const downloader = {
        ensureDownloaded: jest.fn().mockResolvedValue({ config: { capability: 'asr' } }),
        getArtifact: jest.fn().mockImplementation(async (_capability: string, role: string) => {
            if (role === 'tokenizer') {
                return makeArtifact(tokenizerText);
            }
            if (role === 'mel_filters') {
                return makeArtifact(melFiltersText);
            }
            return makeArtifact(null, `/bundle/${role}.pte`);
        }),
    };

    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as AppLogger;
    const recognizer = new Asr(
        downloader as unknown as Downloader,
        new ExecuTorchRuntime(backend),
        logger,
    );

    return { recognizer, backend, downloader, encoderInputs, disposedPaths };
};

describe('Asr', () => {
    it('transcribes a short signal end to end through the fake programs', async () => {
        const { recognizer } = createHarness();
        await recognizer.initialize();

        const text = await recognizer.run(makeSignal(16000));

        expect(text).toBe('Atomes et matière.');
    });

    it('pads the mel spectrogram to the frozen encoder frame count', async () => {
        const { recognizer, encoderInputs } = createHarness();
        await recognizer.initialize();

        await recognizer.run(makeSignal(16000));

        const input = encoderInputs[0];
        expect(input.length).toBe(FIXED_MEL_FRAMES * 128);
        const tail = input.slice((FIXED_MEL_FRAMES - 1) * 128, FIXED_MEL_FRAMES * 128);
        expect(Array.from(tail).every((value) => value === 0)).toBe(true);
    });

    it('truncates mel frames beyond the frozen encoder window', async () => {
        const { recognizer, encoderInputs } = createHarness();
        await recognizer.initialize();
        const signal = makeSignal(16000 * 30);

        await recognizer.run(signal);

        const input = encoderInputs[0];
        expect(input.length).toBe(FIXED_MEL_FRAMES * 128);
        const spectrogram = AsrMelSpectrogram.create(zeroMelFilters());
        const mel = spectrogram.compute(signal);
        expect(Array.from(input.slice(0, 128))).toEqual(Array.from(mel.slice(0, 128)));
    });

    it('rejects run before initialize', async () => {
        const { recognizer } = createHarness();

        await expect(recognizer.run(makeSignal(16000))).rejects.toThrow(AsrException);
    });

    it('rejects initialize when the vocabulary artifact is missing', async () => {
        const { recognizer } = createHarness({ tokenizerText: null });

        await expect(recognizer.initialize()).rejects.toThrow(/vocabulary/i);
    });

    it('rejects initialize when the mel filters artifact is missing', async () => {
        const { recognizer } = createHarness({ melFiltersText: null });

        await expect(recognizer.initialize()).rejects.toThrow(/mel filters/i);
    });

    it('initializes only once on repeated calls', async () => {
        const { recognizer, downloader } = createHarness();

        await recognizer.initialize();
        await recognizer.initialize();

        expect(downloader.ensureDownloaded).toHaveBeenCalledTimes(1);
    });

    it('leaves nothing to dispose when dispose is called before initialize', async () => {
        const { recognizer } = createHarness();

        await expect(recognizer.dispose()).resolves.toBeUndefined();
    });

    it('disposes the three loaded programs', async () => {
        const { recognizer, disposedPaths } = createHarness();
        await recognizer.initialize();

        await recognizer.dispose();

        expect(disposedPaths.sort()).toEqual(['/bundle/decoder.pte', '/bundle/encoder.pte', '/bundle/joint.pte']);
    });
});
