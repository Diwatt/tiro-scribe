/**
 * OnnxRuntime tests
 *
 * Ensure the high-level runtime wrapper loads models and runs inference with
 * the expected shape logic.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// we will mock the underlying onnxruntime-react-native module
const mockDispose = vi.fn();
const mockSession = {
  inputNames: ['input'],
  outputNames: ['output'],
  run: vi.fn(),
  dispose: mockDispose,
};

const mockInferenceSession = vi.fn().mockResolvedValue(mockSession);
// Ensure InferenceSession is callable (as it is in the real native binding)
mockInferenceSession.create = vi.fn().mockResolvedValue(mockSession);

const mockOrt = {
  InferenceSession: mockInferenceSession,
  Tensor: vi.fn().mockImplementation(function(this: any, type: any, data: any, shape: any) {
    this.data = data;
    this.shape = shape;
  }),
};

vi.mock('onnxruntime-react-native', () => mockOrt);

// nothing to mock from util any more; runtime class loads orth directly


import { OnnxRuntime } from '@/Service/OnnxRuntime';
import { SessionNotInitializedError, SpeakerVectorExtractionError } from '@/Exception';

describe('OnnxRuntime', () => {
  let runtime: OnnxRuntime;
  const mockDownloader = { getLocalPath: vi.fn(), download: vi.fn(), getLocalPathForFile: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();

    // default downloader returns path immediately
    mockDownloader.getLocalPath.mockReturnValue('/m.onnx');

    // Ensure model initialization does not crash when downloader is used
    mockDownloader.download.mockResolvedValue({
      config: {
        files: ['dummy_encoder.onnx', 'dummy_decoder.onnx'],
      },
    });
    mockDownloader.getLocalPathForFile.mockReturnValue('/m.onnx');

    runtime = new OnnxRuntime({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any, mockDownloader as any);
  });

  it('load creates a session once', async () => {
    await runtime.load('speaker_id');
    expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith('/m.onnx', { executionProviders: ['cpu'] });
    await runtime.load('speaker_id');
    expect(mockOrt.InferenceSession.create).toHaveBeenCalledTimes(1);
  });

  it('release calls dispose and removes session', async () => {
    await runtime.load('speaker_id');
    expect((runtime as any).sessions.has('speaker_id')).toBe(true);

    await runtime.release('speaker_id');
    expect(mockDispose).toHaveBeenCalled();
    expect((runtime as any).sessions.has('speaker_id')).toBe(false);
  });

  it('unloads previous session when loading different capability', async () => {
    await runtime.load('speaker_id');
    expect((runtime as any).sessions.has('speaker_id')).toBe(true);

    // change downloader path to simulate a different model being fetched
    mockDownloader.getLocalPath.mockReturnValueOnce('/other.onnx');
    await runtime.load('asr');

    expect((runtime as any).sessions.has('speaker_id')).toBe(false);
    expect((runtime as any).sessions.has('asr')).toBe(true);
    expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith('/other.onnx', { executionProviders: ['cpu'] });
  });

  it('runRaw throws before load', async () => {
    await expect(runtime.runRaw('speaker_id', new Float32Array(1), [1])).rejects.toThrow(SessionNotInitializedError);
  });

  it('runRaw returns output from session', async () => {
    await runtime.load('speaker_id');
    mockSession.run.mockResolvedValue({ output: { data: new Float32Array([1, 2, 3]) } });
    const result = await runtime.runRaw('speaker_id', new Float32Array([0, 0, 0]), [1, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  // old CAM++-specific tests removed; shape validation is up to callers.


  it('creates tensor using provided shape', async () => {
    await runtime.load('speaker_id');
    mockSession.run.mockResolvedValue({ output: { data: new Float32Array([0]) } });
    const features = new Float32Array(6);
    await runtime.runRaw('speaker_id', features, [2, 3]);
    expect(mockOrt.Tensor).toHaveBeenCalledWith('float32', features, [2, 3]);
  });
});
