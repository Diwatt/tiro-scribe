import { ExecuTorchProgram, ExecuTorchRunInput, ExecuTorchRuntime } from '@/InferenceModel/ExecuTorch';
import { Pitch } from '@/InferenceModel/Model/Pitch';
import { InferenceModelDownloaderException, PitchException } from '@/Exception';
import type { Downloader } from '@/InferenceModel/Downloader';
import { ModelArtifact } from '@/InferenceModel/Download/ModelArtifact';
import type { AppLogger } from '@/Core/AppLogger';
import type { File } from 'expo-file-system';

const CONFIG_YAML = `
pitch_args:
  sample_rate: 16000
  frame_samples: 1024
  pitch_bins: 360
  cents_per_bin: 20
  min_frequency_hz: 10
  voiced_threshold: 0.6
`;

const FRAME_SAMPLES = 1024;
const PITCH_BINS = 360;
const VOICED_BIN = 12;
const VOICED_HZ = 10 * Math.pow(2, (VOICED_BIN * 20) / 1200);

const makeArtifact = (options: { text?: string | null; uri?: string }): ModelArtifact =>
    new ModelArtifact(
        { exists: true, text: async () => options.text ?? '' } as unknown as File,
        options.uri ?? '/bundle/artifact',
    );

interface Harness {
    readonly pitch: Pitch;
    readonly downloader: { ensureDownloaded: jest.Mock; getArtifact: jest.Mock };
    readonly executorch: { load: jest.Mock; run: jest.Mock };
    readonly disposeProgram: jest.Mock;
}

const createHarness = (options: {
    configText?: string | null;
    activations?: Float32Array;
} = {}): Harness => {
    const disposeProgram = jest.fn();
    const program = new ExecuTorchProgram('/bundle/crepe.pte', new Map([]), jest.fn(), disposeProgram);

    const activations =
        options.activations ?? (() => {
            const values = new Float32Array(PITCH_BINS);
            values[VOICED_BIN] = 0.92;
            return values;
        })();

    const downloader = {
        ensureDownloaded: jest.fn().mockResolvedValue({ config: { capability: 'pitch' } }),
        getArtifact: jest.fn(async (_capability: string, role: string) => {
            if (role === 'encoder') {
                return makeArtifact({ uri: '/bundle/crepe.pte' });
            }
            return makeArtifact({ text: options.configText === undefined ? CONFIG_YAML : options.configText });
        }),
    };

    const executorch = {
        load: jest.fn().mockResolvedValue(program),
        run: jest.fn().mockReturnValue([activations]),
    };

    const pitch = new Pitch(
        downloader as unknown as Downloader,
        executorch as unknown as ExecuTorchRuntime,
        { debug: jest.fn(), error: jest.fn() } as unknown as AppLogger,
    );

    return { pitch, downloader, executorch, disposeProgram };
};

describe('Pitch', () => {
    describe('initialize', () => {
        it('downloads the bundle, loads the program and parses the config', async () => {
            const { pitch, downloader, executorch } = createHarness();

            await pitch.initialize();

            expect(downloader.ensureDownloaded).toHaveBeenCalledWith('pitch');
            expect(downloader.getArtifact).toHaveBeenCalledWith('pitch', 'encoder');
            expect(downloader.getArtifact).toHaveBeenCalledWith('pitch', 'config');
            expect(executorch.load).toHaveBeenCalledWith('/bundle/crepe.pte');
            expect(await pitch.isReady()).toBe(true);
            expect(pitch.getConfig().frameSamples).toBe(FRAME_SAMPLES);
            expect(pitch.getConfig().voicedThreshold).toBe(0.6);
        });

        it('rejects a config with an out-of-range voiced threshold', async () => {
            const configText = 'pitch_args:\n  sample_rate: 16000\n  frame_samples: 1024\n  pitch_bins: 360\n  cents_per_bin: 20\n  min_frequency_hz: 10\n  voiced_threshold: 1.5\n';
            const { pitch } = createHarness({ configText });

            await expect(pitch.initialize()).rejects.toThrow(InferenceModelDownloaderException);
        });

        it('rejects a config missing required parameters', async () => {
            const { pitch } = createHarness({ configText: 'pitch_args:\n  sample_rate: 16000\n' });

            await expect(pitch.initialize()).rejects.toThrow(InferenceModelDownloaderException);
        });
    });

    describe('run', () => {
        it('converts the peak activation bin into a pitch frequency', async () => {
            const { pitch, executorch } = createHarness();
            await pitch.initialize();

            const estimate = await pitch.run(new Float32Array(FRAME_SAMPLES));

            expect(estimate.hz).toBeCloseTo(VOICED_HZ, 6);
            expect(estimate.confidence).toBeCloseTo(0.92, 6);
            const [, runInputs] = executorch.run.mock.calls[0] as unknown as [ExecuTorchProgram, ExecuTorchRunInput[]];
            expect(runInputs[0].shape).toEqual([1, FRAME_SAMPLES]);
        });

        it('returns zero hz when the peak confidence is below the voiced threshold', async () => {
            const activations = new Float32Array(PITCH_BINS);
            activations[VOICED_BIN] = 0.35;
            const { pitch } = createHarness({ activations });
            await pitch.initialize();

            const estimate = await pitch.run(new Float32Array(FRAME_SAMPLES));

            expect(estimate.hz).toBe(0);
            expect(estimate.confidence).toBeCloseTo(0.35, 6);
        });

        it('rejects a frame of the wrong length without running the program', async () => {
            const { pitch, executorch } = createHarness();
            await pitch.initialize();

            await expect(pitch.run(new Float32Array(FRAME_SAMPLES + 1))).rejects.toThrow(PitchException);
            expect(executorch.run).not.toHaveBeenCalled();
        });

        it('throws PitchException when the model is not initialized', async () => {
            const { pitch } = createHarness();

            await expect(pitch.run(new Float32Array(FRAME_SAMPLES))).rejects.toThrow(PitchException);
        });
    });

    describe('dispose', () => {
        it('releases the config', async () => {
            const { pitch, disposeProgram } = createHarness();
            await pitch.initialize();

            await pitch.dispose();

            expect(disposeProgram).toHaveBeenCalled();
            expect(() => pitch.getConfig()).toThrow(PitchException);
        });
    });
});
