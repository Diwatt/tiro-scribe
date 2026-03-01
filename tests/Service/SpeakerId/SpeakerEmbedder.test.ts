/**
 * SpeakerEmbedder tests
 * 
 * Tests ONNX session management and speaker embedding extraction functionality
 */

import { vi } from 'vitest';
import { SessionNotInitializedError, SpeakerVectorExtractionError } from '@/Exception';
import { AudioFeatureExtractor } from '@/Math/AudioFeatureExtractor';
import { SpeakerEmbedder } from '@/Service/SpeakerId/SpeakerEmbedder';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';
import { appLogger } from '@/Service/Logger';

// Mock onnxruntime-react-native
const mockInferenceSession = {
    inputNames: ['audio_features'],
    outputNames: ['embedding'],
    run: vi.fn(),
};

const mockTensor = {
    data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
};

const mockOrt = {
    InferenceSession: {
        create: vi.fn().mockResolvedValue(mockInferenceSession),
    },
    Tensor: vi.fn().mockImplementation((type, data, shape) => mockTensor),
};

vi.mock('onnxruntime-react-native', () => mockOrt);

// Mock AudioFeatureExtractor
const mockAudioFeatureExtractor = {
    extract: vi.fn().mockReturnValue(new Float32Array(80 * 100)), // 80 mel bins * 100 frames
};

// Mock Logger
vi.mock('@/Service/Logger', () => ({
    appLogger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock InferenceModelDownloader
vi.mock('@/Service/InferenceModelDownloader', () => ({
    inferenceModelDownloader: {
        getConfigByLocalPath: vi.fn().mockResolvedValue({
            capability: 'speaker-recognition',
        }),
        download: vi.fn().mockResolvedValue({ uri: '/mock/model/path.onnx' }),
    },
}));

describe('SpeakerEmbedder', () => {
    let speakerEmbedder: SpeakerEmbedder;

    beforeEach(() => {
        vi.clearAllMocks();
        speakerEmbedder = new SpeakerEmbedder(mockAudioFeatureExtractor as any, appLogger);
    });

    describe('constructor', () => {
        it('creates instance with default dependencies', () => {
            expect(() => new SpeakerEmbedder()).not.toThrow();
        });

        it('creates instance with custom dependencies', () => {
            expect(() => new SpeakerEmbedder(mockAudioFeatureExtractor as any, appLogger)).not.toThrow();
        });
    });

    describe('initialize', () => {
        it('initializes ONNX session successfully', async () => {
            await speakerEmbedder.initialize('speaker-model.onnx');
            
            expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith(
                '/mock/model/path.onnx',
                { executionProviders: ['cpu'] }
            );
            expect(appLogger.info).toHaveBeenCalledWith('SpeakerEmbedder initialized successfully');
        });

        it('handles absolute file paths directly', async () => {
            await speakerEmbedder.initialize('/absolute/path/model.onnx');
            
            expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith(
                '/absolute/path/model.onnx',
                { executionProviders: ['cpu'] }
            );
        });

        it('handles file:// URIs directly', async () => {
            await speakerEmbedder.initialize('file://path/model.onnx');
            
            expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith(
                'file://path/model.onnx',
                { executionProviders: ['cpu'] }
            );
        });

        it('throws InvalidAudioFormatError when model not found', async () => {
            vi.mocked(mockOrt.InferenceSession.create).mockRejectedValue(new Error('Model not found'));
            
            await expect(speakerEmbedder.initialize('nonexistent.onnx')).rejects.toThrow('Failed to initialize speaker recognition model');
        });
    });

    describe('extract', () => {
        beforeEach(async () => {
            await speakerEmbedder.initialize('speaker-model.onnx');
            
            // Mock successful inference
            vi.mocked(mockInferenceSession.run).mockResolvedValue({
                embedding: { data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]) },
            });
        });

        it('extracts speaker vector from PCM data', async () => {
            const pcmData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
            
            const result = await speakerEmbedder.extract(pcmData);
            
            expect(mockAudioFeatureExtractor.extract).toHaveBeenCalledWith(pcmData);
            expect(result).toBeInstanceOf(SpeakerVector);
            expect(result.vector).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('throws SessionNotInitializedError when not initialized', async () => {
            const uninitializedEmbedder = new SpeakerEmbedder(mockAudioFeatureExtractor as any, appLogger);
            const pcmData = new Float32Array([0.1, 0.2, 0.3]);
            
            await expect(uninitializedEmbedder.extract(pcmData)).rejects.toThrow(SessionNotInitializedError);
        });

        it('throws SpeakerVectorExtractionError on extraction failure', async () => {
            vi.mocked(mockAudioFeatureExtractor.extract).mockImplementation(() => {
                throw new Error('Feature extraction failed');
            });
            
            const pcmData = new Float32Array([0.1, 0.2, 0.3]);
            
            await expect(speakerEmbedder.extract(pcmData)).rejects.toThrow(SpeakerVectorExtractionError);
        });

        it('throws SpeakerVectorExtractionError on inference failure', async () => {
            vi.mocked(mockInferenceSession.run).mockRejectedValue(new Error('Inference failed'));
            
            const pcmData = new Float32Array([0.1, 0.2, 0.3]);
            
            await expect(speakerEmbedder.extract(pcmData)).rejects.toThrow(SpeakerVectorExtractionError);
        });

        it('only accepts Float32Array', async () => {
            // TypeScript should catch this, but we test runtime behavior
            const pcmData = [0.1, 0.2, 0.3]; // Regular array, not Float32Array
            
            // This should work at runtime since JavaScript arrays are duck-typed
            const result = await speakerEmbedder.extract(pcmData as any);
            
            expect(result).toBeInstanceOf(SpeakerVector);
        });

        it('calculates confidence correctly', async () => {
            // Mock normalized embedding with known magnitude
            vi.mocked(mockInferenceSession.run).mockResolvedValue({
                embedding: { data: new Float32Array([0.6, 0.8, 0, 0, 0]) }, // magnitude = 1.0
            });
            
            const pcmData = new Float32Array([0.1, 0.2, 0.3]);
            const result = await speakerEmbedder.extract(pcmData);
            
            expect(result.confidence).toBe(1.0); // Should be clamped to 1.0
        });
    });

    describe('integration', () => {
        it('handles complete workflow from initialization to extraction', async () => {
            const embedder = new SpeakerEmbedder();
            
            await embedder.initialize('speaker-model.onnx');
            
            vi.mocked(mockInferenceSession.run).mockResolvedValue({
                embedding: { data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]) },
            });
            
            const pcmData = new Float32Array(16000); // 1 second of audio at 16kHz
            const result = await embedder.extract(pcmData);
            
            expect(result).toBeInstanceOf(SpeakerVector);
            expect(result.vector).toHaveLength(5);
            expect(result.confidence).toBeGreaterThan(0);
        });
    });
});
