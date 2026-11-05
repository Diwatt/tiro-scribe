import { ExecuTorchProgram, ExecuTorchRunInput, ExecuTorchRuntime } from '@/InferenceModel/ExecuTorch';
import { Vad } from '@/InferenceModel/Model/Vad';
import { InferenceModelDownloaderException, VadException } from '@/Exception';
import type { Downloader } from '@/InferenceModel/Downloader';
import { ModelArtifact } from '@/InferenceModel/Download/ModelArtifact';
import type { AppLogger } from '@/Core/AppLogger';
import type { File } from 'expo-file-system';

const CONFIG_YAML = `
vad_args:
  sample_rate: 16000
  window_samples: 512
  context_samples: 0
  hidden_size: 128
`;

const CONFIG_YAML_WITH_CONTEXT = `
vad_args:
  sample_rate: 16000
  window_samples: 512
  context_samples: 64
  hidden_size: 128
`;

const WINDOW_SAMPLES = 512;
const CONTEXT_SAMPLES = 64;
const HIDDEN_SIZE = 128;
const STATE_SIZE = 2 * HIDDEN_SIZE;
const SPEECH_PROBABILITY = 0.87;

const makeArtifact = (options: { text?: string | null; uri?: string }): ModelArtifact =>
    new ModelArtifact(
        { exists: true, text: async () => options.text ?? '' } as unknown as File,
        options.uri ?? '/bundle/artifact',
    );

interface Harness {
    readonly vad: Vad;
    readonly downloader: { ensureDownloaded: jest.Mock; getArtifact: jest.Mock };
    readonly executorch: { load: jest.Mock; run: jest.Mock };
    readonly disposeProgram: jest.Mock;
}

const createHarness = (options: {
    configText?: string | null;
    runOutput?: [Float32Array, Float32Array];
} = {}): Harness => {
    const disposeProgram = jest.fn();
    const program = new ExecuTorchProgram('/bundle/silero-vad.pte', new Map([]), jest.fn(), disposeProgram);

    const stateOutput = new Float32Array(STATE_SIZE).fill(0.5);
    const runOutput = options.runOutput ?? [new Float32Array([SPEECH_PROBABILITY]), stateOutput];

    const downloader = {
        ensureDownloaded: jest.fn().mockResolvedValue({ config: { capability: 'vad' } }),
        getArtifact: jest.fn(async (_capability: string, role: string) => {
            if (role === 'encoder') {
                return makeArtifact({ uri: '/bundle/silero-vad.pte' });
            }
            return makeArtifact({ text: options.configText === undefined ? CONFIG_YAML : options.configText });
        }),
    };

    const executorch = {
        load: jest.fn().mockResolvedValue(program),
        run: jest.fn().mockReturnValue(runOutput),
    };

    const vad = new Vad(
        downloader as unknown as Downloader,
        executorch as unknown as ExecuTorchRuntime,
        { debug: jest.fn(), error: jest.fn() } as unknown as AppLogger,
    );

    return { vad, downloader, executorch, disposeProgram };
};

describe('Vad', () => {
    describe('initialize', () => {
        it('downloads the bundle, loads the program and parses the config', async () => {
            const { vad, downloader, executorch } = createHarness();

            await vad.initialize();

            expect(downloader.ensureDownloaded).toHaveBeenCalledWith('vad');
            expect(downloader.getArtifact).toHaveBeenCalledWith('vad', 'encoder');
            expect(downloader.getArtifact).toHaveBeenCalledWith('vad', 'config');
            expect(executorch.load).toHaveBeenCalledWith('/bundle/silero-vad.pte');
            expect(await vad.isReady()).toBe(true);
            expect(vad.getConfig().windowSamples).toBe(WINDOW_SAMPLES);
            expect(vad.getConfig().sampleRateHz).toBe(16000);
        });

        it('rejects a config with an unsupported sample rate', async () => {
            const { vad } = createHarness({ configText: 'vad_args:\n  sample_rate: 22050\n  window_samples: 512\n  context_samples: 0\n  hidden_size: 128\n' });

            await expect(vad.initialize()).rejects.toThrow(InferenceModelDownloaderException);
        });

        it('rejects a config missing required parameters', async () => {
            const { vad } = createHarness({ configText: 'vad_args:\n  sample_rate: 16000\n' });

            await expect(vad.initialize()).rejects.toThrow(InferenceModelDownloaderException);
        });
    });

    describe('run', () => {
        it('returns the speech probability for one window', async () => {
            const { vad, executorch } = createHarness();
            await vad.initialize();

            const probability = await vad.run(new Float32Array(WINDOW_SAMPLES));

            expect(probability).toBeCloseTo(SPEECH_PROBABILITY, 6);
            expect(executorch.run).toHaveBeenCalledTimes(1);
        });

        it('feeds the audio window and the recurrent state to the program', async () => {
            const { vad, executorch } = createHarness();
            await vad.initialize();

            await vad.run(new Float32Array(WINDOW_SAMPLES));

            const [, runInputs] = executorch.run.mock.calls[0] as unknown as [ExecuTorchProgram, ExecuTorchRunInput[]];
            expect(runInputs).toHaveLength(2);
            expect(runInputs[0].shape).toEqual([1, WINDOW_SAMPLES]);
            expect(runInputs[1].shape).toEqual([2, 1, HIDDEN_SIZE]);
            expect(Array.from(runInputs[1].data as Float32Array)).toEqual(new Array(STATE_SIZE).fill(0));
        });

        it('carries the returned state into the next window', async () => {
            const stateOutput = new Float32Array(STATE_SIZE).fill(0.5);
            const { vad, executorch } = createHarness({ runOutput: [new Float32Array([SPEECH_PROBABILITY]), stateOutput] });
            await vad.initialize();

            await vad.run(new Float32Array(WINDOW_SAMPLES));
            await vad.run(new Float32Array(WINDOW_SAMPLES));

            const secondCallInputs = executorch.run.mock.calls[1][1] as ExecuTorchRunInput[];
            expect(Array.from(secondCallInputs[1].data as Float32Array)).toEqual(Array.from(stateOutput));
        });

        it('starts the next window from zero state after reset', async () => {
            const stateOutput = new Float32Array(STATE_SIZE).fill(0.5);
            const { vad, executorch } = createHarness({ runOutput: [new Float32Array([SPEECH_PROBABILITY]), stateOutput] });
            await vad.initialize();

            await vad.run(new Float32Array(WINDOW_SAMPLES));
            vad.reset();
            await vad.run(new Float32Array(WINDOW_SAMPLES));

            const resetCallInputs = executorch.run.mock.calls[1][1] as ExecuTorchRunInput[];
            expect(Array.from(resetCallInputs[1].data as Float32Array)).toEqual(new Array(STATE_SIZE).fill(0));
        });

        it('rejects a window of the wrong length without running the program', async () => {
            const { vad, executorch } = createHarness();
            await vad.initialize();

            await expect(vad.run(new Float32Array(WINDOW_SAMPLES - 1))).rejects.toThrow(VadException);
            expect(executorch.run).not.toHaveBeenCalled();
        });

        it('throws VadException when the model is not initialized', async () => {
            const { vad } = createHarness();

            await expect(vad.run(new Float32Array(WINDOW_SAMPLES))).rejects.toThrow(VadException);
        });
    });

    describe('run with sliding audio context', () => {
        const createRunningVad = async (): Promise<Harness> => {
            const harness = createHarness({ configText: CONFIG_YAML_WITH_CONTEXT });
            await harness.vad.initialize();
            return harness;
        };

        it('feeds zero context followed by the window on the first call', async () => {
            const { vad, executorch } = await createRunningVad();
            const chunk = new Float32Array(WINDOW_SAMPLES).fill(0.25);

            await vad.run(chunk);

            const [, runInputs] = executorch.run.mock.calls[0] as unknown as [ExecuTorchProgram, ExecuTorchRunInput[]];
            expect(runInputs[0].shape).toEqual([1, CONTEXT_SAMPLES + WINDOW_SAMPLES]);
            const programData = runInputs[0].data as Float32Array;
            expect(Array.from(programData.subarray(0, CONTEXT_SAMPLES))).toEqual(new Array(CONTEXT_SAMPLES).fill(0));
            expect(Array.from(programData.subarray(CONTEXT_SAMPLES))).toEqual(Array.from(chunk));
        });

        it('slides the tail of the previous window into the next call', async () => {
            const { vad, executorch } = await createRunningVad();
            const firstChunk = new Float32Array(WINDOW_SAMPLES).fill(0.25);
            await vad.run(firstChunk);

            const secondChunk = new Float32Array(WINDOW_SAMPLES).fill(0.75);
            await vad.run(secondChunk);

            const secondInputs = executorch.run.mock.calls[1][1] as ExecuTorchRunInput[];
            const programData = secondInputs[0].data as Float32Array;
            const expectedTail = firstChunk.slice(WINDOW_SAMPLES - CONTEXT_SAMPLES);
            expect(Array.from(programData.subarray(0, CONTEXT_SAMPLES))).toEqual(Array.from(expectedTail));
            expect(Array.from(programData.subarray(CONTEXT_SAMPLES))).toEqual(Array.from(secondChunk));
        });

        it('starts the next window from zero context after reset', async () => {
            const { vad, executorch } = await createRunningVad();
            await vad.run(new Float32Array(WINDOW_SAMPLES).fill(0.25));
            vad.reset();

            const chunk = new Float32Array(WINDOW_SAMPLES).fill(0.5);
            await vad.run(chunk);

            const resetInputs = executorch.run.mock.calls[1][1] as ExecuTorchRunInput[];
            const programData = resetInputs[0].data as Float32Array;
            expect(Array.from(programData.subarray(0, CONTEXT_SAMPLES))).toEqual(new Array(CONTEXT_SAMPLES).fill(0));
            expect(Array.from(programData.subarray(CONTEXT_SAMPLES))).toEqual(Array.from(chunk));
        });
    });

    describe('dispose', () => {
        it('releases the config and the recurrent state', async () => {
            const { vad, disposeProgram } = createHarness();
            await vad.initialize();

            await vad.dispose();

            expect(disposeProgram).toHaveBeenCalled();
            expect(vad.isReady()).resolves.toBe(false);
            expect(() => vad.getConfig()).toThrow(VadException);
        });
    });
});
