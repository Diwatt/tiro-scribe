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
const mockRuntime = { loadModel: vi.fn().mockResolvedValue(undefined), run: vi.fn().mockResolvedValue(new Float32Array([0.1,0.2,0.3])) };
const mockDownloader = { getLocalPath: vi.fn(), download: vi.fn(), getLocalPathForFile: vi.fn() };

vi.mock('@/Service/OnnxRuntime', () => ({ OnnxRuntime: vi.fn().mockImplementation(() => mockRuntime) }));
vi.mock('@/Math/AudioFeatureExtractor', () => {
  class MockAudioFeatureExtractor { extract = vi.fn().mockImplementation(() => new Float32Array(80 * 100)); }
  return { AudioFeatureExtractor: MockAudioFeatureExtractor };
});
vi.mock('@/Core/Container', () => ({ Container: { register: vi.fn(), get: vi.fn((cls: any) => cls?.name?.includes('AppLogger') ? mockLogger : undefined) } }));

describe('SpeakerEmbedder', () => {
  let embedder: SpeakerEmbedder;
  let extractor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    embedder = new SpeakerEmbedder(undefined, mockRuntime as any);
    extractor = (embedder as any).audioFeatureExtractor;
  });

  it('constructs without error', () => {
    expect(() => new SpeakerEmbedder(undefined, mockRuntime as any)).not.toThrow();
  });


  describe('extract', () => {
    it('throws if not initialized', async () => {
      const un = new SpeakerEmbedder(undefined, mockRuntime as any);
      // runtime should reject when no model has been loaded
      mockRuntime.run.mockRejectedValueOnce(new SessionNotInitializedError('no session'));
      await expect(un.extract(new Float32Array([1]))).rejects.toThrow(SpeakerVectorExtractionError);
    });

    it('calls extractor and runtime and normalizes output', async () => {
      const pcm = new Float32Array([0.1]);
      const res = await embedder.extract(pcm);
      expect(extractor.extract).toHaveBeenCalledWith(pcm);
      // features length is 80*100 per mock extractor; compute expected shape
      const expectedShape = [1, 80, 100];
      expect(mockRuntime.run).toHaveBeenCalledWith('speaker_id', expect.any(Float32Array), expectedShape);
      expect(res).toBeInstanceOf(SpeakerVector);
      expect(res.vector.length).toBe(3);
    });

    it('propagates extractor error', async () => {
      extractor.extract.mockImplementation(() => { throw new Error('err'); });
      await expect(embedder.extract(new Float32Array([0]))).rejects.toThrow(SpeakerVectorExtractionError);
    });

    it('propagates runtime error', async () => {
      mockRuntime.run.mockRejectedValueOnce(new Error('err2'));
      await expect(embedder.extract(new Float32Array([0]))).rejects.toThrow(SpeakerVectorExtractionError);
    });
  });
});
