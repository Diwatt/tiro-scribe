/**
 * Runtime tests
 *
 * Ensure the high-level runtime wrapper loads models and runs inference with
 * the expected shape logic. Behavior is observed through the public API
 * (load / release / runRaw), never through internal state.
 */


// we will mock the underlying onnxruntime-react-native module
const mockDispose = jest.fn();
const mockSession = {
  inputNames: ['input'],
  outputNames: ['output'],
  run: jest.fn(),
  dispose: mockDispose,
};

const mockInferenceSession = Object.assign(jest.fn().mockResolvedValue(mockSession), {
    // InferenceSession.create is the callable factory in the real native binding
    create: jest.fn().mockResolvedValue(mockSession),
}) as jest.Mock & { create: jest.Mock };

const mockOrt = {
  InferenceSession: mockInferenceSession,
  Tensor: jest.fn().mockImplementation(function(this: any, type: any, data: any, shape: any) {
    this.data = data;
    this.shape = shape;
  }),
};

jest.mock('onnxruntime-react-native', () => mockOrt);


import { observable } from '@legendapp/state';

import { Runtime } from '@/InferenceModel/Runtime';
import { SessionNotInitializedError } from '@/Exception';
import { DownloadState } from '@/InferenceModel/Download/Type';

describe('Runtime', () => {
  let runtime: Runtime;
  const mockDownloader = { getLocalPath: jest.fn(), download: jest.fn(), ensureDownloaded: jest.fn(), getArtifactText: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();

    // default downloader returns path immediately
    mockDownloader.getLocalPath.mockResolvedValue('/m.onnx');

    // ensureDownloaded resolves to a completed executor (no wait needed)
    mockDownloader.ensureDownloaded.mockResolvedValue({
      config: { capability: 'speaker_id' },
      state$: observable(DownloadState.Completed),
    });

    // SpeakerId.initialize() reads the config.yaml artifact from the bundle
    mockDownloader.getArtifactText.mockResolvedValue(
      [
        'dataset_args:',
        '  resample_rate: 16000',
        '  fbank_args: { num_mel_bins: 80, frame_length: 25, frame_shift: 10 }',
        'model_args: { embed_dim: 512, feat_dim: 80 }',
      ].join('\n'),
    );

    // Ensure model initialization does not crash when downloader is used
    mockDownloader.download.mockResolvedValue({
      config: {
        files: ['dummy_encoder.onnx', 'dummy_decoder.onnx'],
      },
      state$: observable(DownloadState.Completed),
    });


    runtime = new Runtime({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any, mockDownloader as any);
  });

  describe('load', () => {
    it('creates the session once and reuses it on subsequent loads', async () => {
      await runtime.load('speaker_id');
      expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith('/m.onnx', { executionProviders: ['cpu'] });
      await runtime.load('speaker_id');
      expect(mockOrt.InferenceSession.create).toHaveBeenCalledTimes(1);
    });

    it('downloads the model then creates the session when no local file exists', async () => {
      mockDownloader.getLocalPath.mockResolvedValueOnce(undefined);

      await runtime.load('speaker_id');

      expect(mockDownloader.download).toHaveBeenCalledWith('speaker_id');
      expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith('/m.onnx', { executionProviders: ['cpu'] });
    });

    it('waits for an in-progress download to complete before creating the session', async () => {
      const executorState$ = observable(DownloadState.Downloading);
      const executor = { config: { files: [] }, state$: executorState$ };

      // The local file only becomes available once the download completed.
      mockDownloader.getLocalPath.mockImplementation(async () =>
        executorState$.get() === DownloadState.Completed ? '/m.onnx' : undefined,
      );
      mockDownloader.download.mockImplementation(async () => {
        setTimeout(() => executorState$.set(DownloadState.Completed), 10);
        return executor;
      });

      await runtime.load('speaker_id');

      expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith('/m.onnx', { executionProviders: ['cpu'] });
    });

    it('rejects when the in-progress download fails', async () => {
      const executorState$ = observable(DownloadState.Downloading);
      const executor = { config: { files: [] }, state$: executorState$ };

      mockDownloader.getLocalPath.mockResolvedValue(undefined);
      mockDownloader.download.mockImplementation(async () => {
        setTimeout(() => executorState$.set(DownloadState.Failed), 10);
        return executor;
      });

      await expect(runtime.load('speaker_id')).rejects.toThrow(`Model download ended with state ${DownloadState.Failed}`);

      expect(mockOrt.InferenceSession.create).not.toHaveBeenCalled();
    });

    it('rejects when the model is still unavailable after downloading', async () => {
      mockDownloader.getLocalPath.mockResolvedValue(undefined);

      await expect(runtime.load('speaker_id')).rejects.toThrow('Model for speaker_id not available');

      expect(mockOrt.InferenceSession.create).not.toHaveBeenCalled();
    });

    it('rejects with Unknown model capability error for an unregistered capability', async () => {
      await expect(runtime.load('traduction')).rejects.toThrow('Unknown model capability: traduction');

      expect(mockDownloader.download).not.toHaveBeenCalled();
      expect(mockOrt.InferenceSession.create).not.toHaveBeenCalled();
    });

    it('unloads the previous capability when loading a different one', async () => {
      await runtime.load('speaker_id');

      // change downloader path to simulate a different model being fetched
      mockDownloader.getLocalPath.mockResolvedValue('/other.onnx');
      await runtime.load('asr');

      await expect(runtime.runRaw('speaker_id', new Float32Array(1), [1])).rejects.toThrow(SessionNotInitializedError);

      mockSession.run.mockResolvedValue({ output: { data: new Float32Array([7]) } });
      const result = await runtime.runRaw('asr', new Float32Array(1), [1]);

      expect(result).toEqual([7]);
      expect(mockOrt.InferenceSession.create).toHaveBeenLastCalledWith('/other.onnx', { executionProviders: ['cpu'] });
    });
  });

  describe('release', () => {
    it('disposes the session and leaves the capability unusable', async () => {
      await runtime.load('speaker_id');

      await runtime.release('speaker_id');

      expect(mockDispose).toHaveBeenCalledTimes(1);
      await expect(runtime.runRaw('speaker_id', new Float32Array(1), [1])).rejects.toThrow(SessionNotInitializedError);
    });
  });

  describe('runRaw', () => {
    it('rejects with SessionNotInitializedError before the session is loaded', async () => {
      await expect(runtime.runRaw('speaker_id', new Float32Array(1), [1])).rejects.toThrow(SessionNotInitializedError);
    });

    it('returns the session output as a number array', async () => {
      await runtime.load('speaker_id');
      mockSession.run.mockResolvedValue({ output: { data: new Float32Array([1, 2, 3]) } });

      const result = await runtime.runRaw('speaker_id', new Float32Array([0, 0, 0]), [1, 3]);

      expect(result).toEqual([1, 2, 3]);
    });

    it('creates tensor using provided shape', async () => {
      await runtime.load('speaker_id');
      mockSession.run.mockResolvedValue({ output: { data: new Float32Array([0]) } });

      const features = new Float32Array(6);
      await runtime.runRaw('speaker_id', features, [2, 3]);

      expect(mockOrt.Tensor).toHaveBeenCalledWith('float32', features, [2, 3]);
    });
  });
});
