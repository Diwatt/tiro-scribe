import { ExecuTorchProgram, ExecuTorchRunInput, ExecuTorchRuntime } from '@/InferenceModel/ExecuTorch';
import { SpeakerId } from '@/InferenceModel/Model/SpeakerId';
import type { Downloader } from '@/InferenceModel/Downloader';
import { ModelArtifact } from '@/InferenceModel/Download/ModelArtifact';
import { ExecuTorchException, InferenceModelDownloaderException, SpeakerIdException } from '@/Exception';
import type { AppLogger } from '@/Core/AppLogger';
import type { File } from 'expo-file-system';

const CONFIG_YAML = `
model_args:
  embed_dim: 512
  feat_dim: 80
dataset_args:
  resample_rate: 16000
  fbank_args:
    num_mel_bins: 80
    frame_length: 0.025
    frame_shift: 0.01
`;

const EMBEDDING_DIM = 512;
const NUM_MEL_BINS = 80;
const FIXED_TIME_FRAMES = 500;

const makeArtifact = (options: { text?: string | null; uri?: string }): ModelArtifact =>
    new ModelArtifact(
        { exists: true, text: async () => options.text ?? '' } as unknown as File,
        options.uri ?? '/bundle/artifact',
    );

interface Harness {
    readonly speakerId: SpeakerId;
    readonly downloader: { ensureDownloaded: jest.Mock; getArtifact: jest.Mock };
    readonly executorch: { load: jest.Mock; run: jest.Mock };
    readonly disposeProgram: jest.Mock;
}

const createHarness = (overrides: {
    configText?: string | null;
    runOutput?: Float32Array;
} = {}): Harness => {
    const disposeProgram = jest.fn();
    const program = new ExecuTorchProgram(
        '/bundle/cam++.pte',
        new Map([]),
        jest.fn(),
        disposeProgram,
    );

    const downloader = {
        ensureDownloaded: jest.fn().mockResolvedValue({ config: { capability: 'speaker_id' } }),
        getArtifact: jest.fn(async (_capability: string, role: string) => {
            if (role === 'encoder') {
                return makeArtifact({ uri: '/bundle/cam++.pte' });
            }
            return makeArtifact({ text: overrides.configText === undefined ? CONFIG_YAML : overrides.configText });
        }),
    };

    const executorch = {
        load: jest.fn().mockResolvedValue(program),
        run: jest.fn().mockReturnValue([overrides.runOutput ?? new Float32Array(EMBEDDING_DIM).fill(0.25)]),
    };

    const speakerId = new SpeakerId(
        downloader as unknown as Downloader,
        executorch as unknown as ExecuTorchRuntime,
        { debug: jest.fn(), error: jest.fn() } as unknown as AppLogger,
    );

    return { speakerId, downloader, executorch, disposeProgram };
};

describe('SpeakerId', () => {
    describe('initialize', () => {
        it('downloads the bundle, loads the program and parses the config', async () => {
            const { speakerId, downloader, executorch } = createHarness();

            await speakerId.initialize();

            expect(downloader.ensureDownloaded).toHaveBeenCalledWith('speaker_id');
            expect(downloader.getArtifact).toHaveBeenCalledWith('speaker_id', 'encoder');
            expect(executorch.load).toHaveBeenCalledWith('/bundle/cam++.pte');
            expect(await speakerId.isReady()).toBe(true);
            expect(speakerId.getConfig().numMelBins).toBe(NUM_MEL_BINS);
            expect(speakerId.getConfig().embeddingDim).toBe(EMBEDDING_DIM);
        });

        it('is a no-op when already initialized', async () => {
            const { speakerId, downloader, executorch } = createHarness();

            await speakerId.initialize();
            await speakerId.initialize();

            expect(downloader.ensureDownloaded).toHaveBeenCalledTimes(1);
            expect(executorch.load).toHaveBeenCalledTimes(1);
        });

        it('rejects when the config artifact is not parseable', async () => {
            const { speakerId } = createHarness({ configText: null });

            await expect(speakerId.initialize()).rejects.toThrow(InferenceModelDownloaderException);
            expect(await speakerId.isReady()).toBe(false);
        });
    });

    describe('run', () => {
        it('executes the program with the frozen input shape and returns the embedding', async () => {
            const embedding = new Float32Array(EMBEDDING_DIM).fill(0.5);
            const { speakerId, executorch } = createHarness({ runOutput: embedding });
            await speakerId.initialize();

            const features = new Float32Array(FIXED_TIME_FRAMES * NUM_MEL_BINS);
            const result = await speakerId.run(features);

            expect(Array.from(result)).toEqual(Array.from(embedding));
            const [, runInputs] = executorch.run.mock.calls[0] as unknown as [ExecuTorchProgram, ExecuTorchRunInput[]];
            expect(runInputs.length).toBe(1);
            expect(runInputs[0].shape).toEqual([1, FIXED_TIME_FRAMES, NUM_MEL_BINS]);
        });

        it('truncates features longer than the frozen window', async () => {
            const { speakerId, executorch } = createHarness();
            await speakerId.initialize();

            const features = new Float32Array((FIXED_TIME_FRAMES + 120) * NUM_MEL_BINS);
            await speakerId.run(features);

            const [, runInputs] = executorch.run.mock.calls[0] as unknown as [ExecuTorchProgram, ExecuTorchRunInput[]];
            expect(runInputs[0].data.length).toBe(FIXED_TIME_FRAMES * NUM_MEL_BINS);
        });

        it('pads features shorter than the frozen window with zeros', async () => {
            const { speakerId, executorch } = createHarness();
            await speakerId.initialize();

            const features = new Float32Array(120 * NUM_MEL_BINS);
            features[0] = 7;
            await speakerId.run(features);

            const [, runInputs] = executorch.run.mock.calls[0] as unknown as [ExecuTorchProgram, ExecuTorchRunInput[]];
            expect(runInputs[0].data.length).toBe(FIXED_TIME_FRAMES * NUM_MEL_BINS);
            expect((runInputs[0].data as Float32Array)[0]).toBe(7);
            expect((runInputs[0].data as Float32Array)[features.length]).toBe(0);
        });

        it('rejects run before initialize', async () => {
            const { speakerId } = createHarness();

            await expect(speakerId.run(new Float32Array(8))).rejects.toThrow(SpeakerIdException);
        });
    });

    describe('dispose', () => {
        it('disposes the loaded program and resets readiness', async () => {
            const { speakerId, disposeProgram } = createHarness();
            await speakerId.initialize();

            await speakerId.dispose();

            expect(disposeProgram).toHaveBeenCalledTimes(1);
            expect(await speakerId.isReady()).toBe(false);
        });

        it('is a no-op when nothing was loaded', async () => {
            const { speakerId, disposeProgram } = createHarness();

            await speakerId.dispose();

            expect(disposeProgram).not.toHaveBeenCalled();
        });
    });
});
