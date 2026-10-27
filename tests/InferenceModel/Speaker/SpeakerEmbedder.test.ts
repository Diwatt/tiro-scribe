/**
 * SpeakerEmbedder tests
 *
 * Verifies that the service delegates ONNX operations to the runtime wrapper and
 * handles feature extraction/normalization.
 */



import { SessionNotInitializedError, SpeakerVectorExtractionError } from '@/Exception';
import { SpeakerEmbedder } from '@/InferenceModel/Speaker/SpeakerEmbedder';
import { SpeakerVector } from '@/InferenceModel/Speaker/SpeakerVector';

const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockModel = { run: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };
const mockRuntime = { load: jest.fn().mockResolvedValue(undefined), getModel: jest.fn().mockResolvedValue(mockModel) };

jest.mock('@/InferenceModel/Runtime', () => ({ Runtime: jest.fn().mockImplementation(() => mockRuntime) }));

const mockExtractor = { extract: jest.fn().mockImplementation(() => new Float32Array(80 * 100)) };
jest.mock('@/Math/AudioFeatureExtractor', () => {
  class MockAudioFeatureExtractor {
    extract = mockExtractor.extract;
  }
  return { AudioFeatureExtractor: MockAudioFeatureExtractor };
});

jest.mock('@/Core/Container', () => ({ Container: { register: jest.fn(), get: jest.fn((cls: any) => cls?.name?.includes('AppLogger') ? mockLogger : undefined) } }));

describe('SpeakerEmbedder', () => {
  let embedder: SpeakerEmbedder;
  let extractor: any;

  beforeEach(() => {
    jest.clearAllMocks();

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
    it('wraps runtime failure in SpeakerVectorExtractionError', async () => {
      // runtime rejects when the speaker_id model was never loaded
      mockRuntime.getModel.mockRejectedValueOnce(new SessionNotInitializedError('no session'));
      await expect(embedder.extract(new Float32Array([1]))).rejects.toThrow(SpeakerVectorExtractionError);
    });

    it('calls extractor and runtime with the extracted features', async () => {
      const pcm = new Float32Array([0.1]);
      const res = await embedder.extract(pcm);
      expect(extractor.extract).toHaveBeenCalledWith(pcm);
      expect(mockRuntime.getModel).toHaveBeenCalledWith('speaker_id');
      expect(mockModel.run).toHaveBeenCalledWith(expect.any(Float32Array));
      expect(res).toBeInstanceOf(SpeakerVector);
      expect(res.vector).toHaveLength(3);
    });

    it('normalizes the embedding to unit length', async () => {
      const res = await embedder.extract(new Float32Array([0.1]));
      const raw = [0.1, 0.2, 0.3];
      const rawMagnitude = Math.sqrt(raw[0] ** 2 + raw[1] ** 2 + raw[2] ** 2);
      res.vector.forEach((component, index) => expect(component).toBeCloseTo(raw[index] / rawMagnitude, 10));
    });

    it('sets confidence to the raw embedding magnitude when it is below 1', async () => {
      const res = await embedder.extract(new Float32Array([0.1]));
      const rawMagnitude = Math.sqrt(0.1 ** 2 + 0.2 ** 2 + 0.3 ** 2);
      expect(res.confidence).toBeCloseTo(rawMagnitude, 10);
    });

    it('clamps confidence to 1 when the raw embedding magnitude exceeds 1', async () => {
      mockModel.run.mockResolvedValueOnce([3, 4]);
      const res = await embedder.extract(new Float32Array([0.1]));
      expect(res.confidence).toBe(1);
      expect(res.vector[0]).toBeCloseTo(0.6, 10);
      expect(res.vector[1]).toBeCloseTo(0.8, 10);
    });

    it('keeps a zero-magnitude embedding unchanged with zero confidence', async () => {
      mockModel.run.mockResolvedValueOnce([0, 0, 0]);
      const res = await embedder.extract(new Float32Array([0.1]));
      expect(res.vector).toEqual([0, 0, 0]);
      expect(res.confidence).toBe(0);
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
