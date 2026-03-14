/**
 * SpeakerEmbedder tests
 *
 * Verifies that the service delegates ONNX operations to the runtime wrapper and
 * handles feature extraction/normalization.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';


import { SessionNotInitializedError, SpeakerVectorExtractionError } from '@/Exception';
import { SpeakerEmbedder } from '@/Service/SpeakerId/SpeakerEmbedder';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';

const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const mockModel = { run: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]) };
const mockRuntime = { load: vi.fn().mockResolvedValue(undefined), getModel: vi.fn().mockResolvedValue(mockModel) };

vi.mock('@/Service/OnnxRuntime', () => ({ OnnxRuntime: vi.fn().mockImplementation(() => mockRuntime) }));

const mockExtractor = { extract: vi.fn().mockImplementation(() => new Float32Array(80 * 100)) };
vi.mock('@/Math/AudioFeatureExtractor', () => {
  class MockAudioFeatureExtractor {
    extract = mockExtractor.extract;
  }
  return { AudioFeatureExtractor: MockAudioFeatureExtractor };
});

vi.mock('@/Core/Container', () => ({ Container: { register: vi.fn(), get: vi.fn((cls: any) => cls?.name?.includes('AppLogger') ? mockLogger : undefined) } }));

describe('SpeakerEmbedder', () => {
  let embedder: SpeakerEmbedder;
  let extractor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRuntime.getModel.mockReset();
    mockRuntime.getModel.mockResolvedValue(mockModel);
    mockModel.run.mockReset();
    mockModel.run.mockResolvedValue([0.1, 0.2, 0.3]);
    mockExtractor.extract.mockReset();
    mockExtractor.extract.mockImplementation(() => new Float32Array(80 * 100));

    embedder = new SpeakerEmbedder(mockExtractor as any, mockRuntime as any);
    extractor = (embedder as any).audioFeatureExtractor;
  });

  it('constructs without error', () => {
    expect(() => new SpeakerEmbedder(mockExtractor as any, mockRuntime as any)).not.toThrow();
  });


  describe('extract', () => {
    it('throws if not initialized', async () => {
      const un = new SpeakerEmbedder(undefined, mockRuntime as any);
      // runtime should reject when no model has been loaded
      mockRuntime.getModel.mockRejectedValueOnce(new SessionNotInitializedError('no session'));
      await expect(un.extract(new Float32Array([1]))).rejects.toThrow(SpeakerVectorExtractionError);
    });

    it('calls extractor and runtime and normalizes output', async () => {
      const pcm = new Float32Array([0.1]);
      const res = await embedder.extract(pcm);
      expect(extractor.extract).toHaveBeenCalledWith(pcm);
      expect(mockRuntime.getModel).toHaveBeenCalledWith('speaker_id');
      expect(mockModel.run).toHaveBeenCalledWith(expect.any(Float32Array));
      expect(res).toBeInstanceOf(SpeakerVector);
      expect(res.vector.length).toBe(3);
    });

    it('propagates extractor error', async () => {
      mockExtractor.extract.mockImplementation(() => {
        throw new Error('err');
      });
      await expect(embedder.extract(new Float32Array([0]))).rejects.toThrow(SpeakerVectorExtractionError);
    });

    it('propagates runtime error', async () => {
      mockModel.run.mockRejectedValueOnce(new Error('err2'));
      await expect(embedder.extract(new Float32Array([0]))).rejects.toThrow(SpeakerVectorExtractionError);
    });
  });
});
