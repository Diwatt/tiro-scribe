/**
 * Runtime tests
 *
 * Ensure the runtime resolves and initializes self-managed ExecuTorch models
 * per capability. Behavior is observed through the public API
 * (load / getModel / dispose), never through internal state.
 */

// The ExecuTorch JSI bridge throws at import time without the native module;
// the runtimes are exercised through spied prototype methods and mocked
// downloader artifacts (see ExecuTorch tests for the engine itself).
jest.mock('react-native-executorch', () => ({ loadModel: jest.fn(), tensor: jest.fn() }));

import { Runtime } from '@/InferenceModel/Runtime';
import { ExecuTorchProgram, ExecuTorchRuntime } from '@/InferenceModel/ExecuTorch';
import { ModelArtifact } from '@/InferenceModel/Download/ModelArtifact';
import { UnsupportedCapabilityException } from '@/Exception';
import type { File } from 'expo-file-system';

const ASR_CONFIG_YAML = '{}';

const makeArtifact = (options: { text?: string | null; uri?: string }): ModelArtifact =>
    new ModelArtifact(
        { exists: true, text: async () => options.text ?? '' } as unknown as File,
        options.uri ?? '/bundle/artifact',
    );

describe('Runtime', () => {
    let runtime: Runtime;
    const mockLogger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };
    const mockDownloader = {
        ensureDownloaded: jest.fn(),
        getArtifact: jest.fn(),
        isModelDownloaded: jest.fn(),
        getTotalSize: jest.fn(),
        download: jest.fn(),
        getLocalPath: jest.fn(),
    };

    const mockProgram = (): ExecuTorchProgram =>
        new ExecuTorchProgram('/bundle/program.pte', new Map([]), jest.fn(), jest.fn());

    beforeEach(() => {
        jest.clearAllMocks();
        mockDownloader.ensureDownloaded.mockResolvedValue({ config: { capability: 'test' } });
        mockDownloader.getArtifact.mockImplementation(async (_capability: string, role: string) => {
            if (role === 'encoder') {
                return makeArtifact({ uri: '/bundle/program.pte' });
            }
            return makeArtifact({ text: ASR_CONFIG_YAML });
        });
        jest.spyOn(ExecuTorchRuntime.prototype, 'load').mockResolvedValue(mockProgram());
        runtime = new Runtime(mockLogger as never, mockDownloader as never);
    });

    describe('load', () => {
        it('initializes a speaker_id model on the ExecuTorch path without creating an ORT session', async () => {
            mockDownloader.getArtifact.mockImplementation(async (_capability: string, role: string) => {
                if (role === 'encoder') {
                    return makeArtifact({ uri: '/bundle/cam++.pte' });
                }
                return makeArtifact({
                    text: [
                        'model_args:',
                        '  embed_dim: 512',
                        '  feat_dim: 80',
                        'dataset_args:',
                        '  resample_rate: 16000',
                        '  fbank_args:',
                        '    num_mel_bins: 80',
                        '    frame_length: 0.025',
                        '    frame_shift: 0.01',
                    ].join('\n'),
                });
            });

            await runtime.load('speaker_id');

            expect(mockDownloader.ensureDownloaded).toHaveBeenCalledWith('speaker_id');
            const model = await runtime.getModel('speaker_id');
            expect(await model.isReady()).toBe(true);
        });

        it('initializes the asr recognizer', async () => {
            mockDownloader.getArtifact.mockImplementation(async (_capability: string, role: string) => {
                if (role === 'encoder' || role === 'decoder' || role === 'joint') {
                    return makeArtifact({ uri: '/bundle/program.pte' });
                }
                const text =
                    role === 'tokenizer'
                        ? JSON.stringify(Array.from({ length: 16 }, (_, index) => `piece_${index}`))
                        : JSON.stringify({ rows: 128, cols: 257, data: Array.from({ length: 128 }, () => new Array<number>(257).fill(0)) });
                return makeArtifact({ text });
            });

            await runtime.load('asr');

            const model = await runtime.getModel('asr');
            expect(await model.isReady()).toBe(true);
        });

        it('initializes each model only once', async () => {
            mockDownloader.getArtifact.mockImplementation(async (_capability: string, role: string) => {
                if (role === 'encoder' || role === 'decoder' || role === 'joint') {
                    return makeArtifact({ uri: '/bundle/program.pte' });
                }
                const text =
                    role === 'tokenizer'
                        ? JSON.stringify(Array.from({ length: 16 }, (_, index) => `piece_${index}`))
                        : JSON.stringify({ rows: 128, cols: 257, data: Array.from({ length: 128 }, () => new Array<number>(257).fill(0)) });
                return makeArtifact({ text });
            });

            await runtime.load('asr');
            await runtime.load('asr');

            expect(mockDownloader.ensureDownloaded).toHaveBeenCalledTimes(1);
        });

        it('initializes the vad detector', async () => {
            mockDownloader.getArtifact.mockImplementation(async (_capability: string, role: string) => {
                if (role === 'encoder') {
                    return makeArtifact({ uri: '/bundle/silero-vad.pte' });
                }
                return makeArtifact({
                    text: [
                        'vad_args:',
                        '  sample_rate: 16000',
                        '  window_samples: 512',
                        '  context_samples: 0',
                        '  hidden_size: 128',
                    ].join('\n'),
                });
            });

            await runtime.load('vad');

            const model = await runtime.getModel('vad');
            expect(await model.isReady()).toBe(true);
        });

        it('initializes the pitch estimator', async () => {
            mockDownloader.getArtifact.mockImplementation(async (_capability: string, role: string) => {
                if (role === 'encoder') {
                    return makeArtifact({ uri: '/bundle/crepe.pte' });
                }
                return makeArtifact({
                    text: [
                        'pitch_args:',
                        '  sample_rate: 16000',
                        '  frame_samples: 1024',
                        '  pitch_bins: 360',
                        '  cents_per_bin: 20',
                        '  min_frequency_hz: 10',
                        '  voiced_threshold: 0.6',
                    ].join('\n'),
                });
            });

            await runtime.load('pitch');

            const model = await runtime.getModel('pitch');
            expect(await model.isReady()).toBe(true);
        });

        it('rejects an unknown capability', async () => {
            await expect(runtime.load('telepathy')).rejects.toThrow(UnsupportedCapabilityException);
        });
    });

    describe('dispose', () => {
        it('disposes every loaded model', async () => {
            mockDownloader.getArtifact.mockImplementation(async (_capability: string, role: string) => {
                if (role === 'encoder') {
                    return makeArtifact({ uri: '/bundle/cam++.pte' });
                }
                return makeArtifact({
                    text: [
                        'model_args:',
                        '  embed_dim: 512',
                        '  feat_dim: 80',
                        'dataset_args:',
                        '  resample_rate: 16000',
                        '  fbank_args:',
                        '    num_mel_bins: 80',
                        '    frame_length: 0.025',
                        '    frame_shift: 0.01',
                    ].join('\n'),
                });
            });
            const disposeSpy = jest.spyOn(ExecuTorchProgram.prototype, 'dispose');
            await runtime.load('speaker_id');
            const model = await runtime.getModel('speaker_id');

            await runtime.dispose();

            expect(disposeSpy).toHaveBeenCalled();
            expect(await model.isReady()).toBe(false);
        });
    });
});
