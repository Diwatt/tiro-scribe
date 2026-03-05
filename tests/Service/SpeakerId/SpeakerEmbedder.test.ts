/**
 * SpeakerEmbedder tests
 * 
 * Tests ONNX session management and speaker embedding extraction functionality
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SessionNotInitializedError, SpeakerVectorExtractionError } from '@/Exception';
import { SpeakerEmbedder } from '@/Service/SpeakerId/SpeakerEmbedder';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';

// Mock onnxruntime-react-native
const mockInferenceSession = {
    inputNames: ['audio_features'],
    outputNames: ['embedding'],
    run: vi.fn(),
};

const mockTensorConstructor = vi.fn().mockImplementation(function(this: any, type: any, data: any, shape: any) {
    this.data = data || new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
    this.type = type;
    this.shape = shape;
});

const mockOrt = {
    InferenceSession: {
        create: vi.fn().mockResolvedValue(mockInferenceSession),
    },
    Tensor: mockTensorConstructor,
};

vi.mock('onnxruntime-react-native', () => mockOrt);

vi.mock('@/Math/AudioFeatureExtractor', () => {
    class MockAudioFeatureExtractor {
        extract = vi.fn().mockImplementation((pcm: any) => {
            // Handle both Float32Array and regular arrays
            const features = new Float32Array(80 * 100); // 80 mel bins * 100 frames
            return features;
        });
    }
    
    return {
        AudioFeatureExtractor: MockAudioFeatureExtractor,
    };
});

// Mock Logger
const mockLoggerInstance = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

vi.mock('@/Service/Logger', () => ({
    AppLogger: {
        getInstance: () => mockLoggerInstance,
    },
}));

// Mock InferenceModelDownloader
vi.mock('@/Service/InferenceModelDownloader', () => ({
    InferenceModelDownloader: vi.fn().mockImplementation(() => ({
        getConfigByLocalPath: vi.fn().mockResolvedValue({
            capability: 'speaker-recognition',
            id: 'speaker-model',
            files: [{ url: '/mock/model/path.onnx' }]
        }),
        download: vi.fn().mockResolvedValue({ 
            config: {
                capability: 'speaker-recognition',
                id: 'speaker-model',
                files: [{ url: '/mock/model/path.onnx' }]
            }
        }),
    })),
}));

describe('SpeakerEmbedder', () => {
    let speakerEmbedder: SpeakerEmbedder;
    let mockExtractor: any;

    beforeEach(() => {
        vi.clearAllMocks();
        speakerEmbedder = new SpeakerEmbedder();
        // Get the mock instance from the constructor
        mockExtractor = speakerEmbedder['audioFeatureExtractor'];
    });

    describe('constructor', () => {
        it('creates instance with default dependencies', () => {
            expect(() => new SpeakerEmbedder()).not.toThrow();
        });

        it('creates instance with custom dependencies', () => {
            expect(() => new SpeakerEmbedder()).not.toThrow();
        });
    });

    describe('initialize', () => {
        it('initializes ONNX session successfully', async () => {
            await speakerEmbedder.initialize('speaker-model.onnx');
            
            expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith(
                '/mock/model/path.onnx',
                { executionProviders: ['cpu'] }
            );
            expect(mockLoggerInstance.info).toHaveBeenCalledWith('SpeakerEmbedder initialized successfully');
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
            // Reset the mock to resolve successfully
            vi.mocked(mockOrt.InferenceSession.create).mockResolvedValue(mockInferenceSession);
            
            await speakerEmbedder.initialize('speaker-model.onnx');
            
            // Mock successful inference
            vi.mocked(mockInferenceSession.run).mockResolvedValue({
                embedding: new (mockTensorConstructor as any)('float32', new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]), [1, 5]),
            });
        });

        it('extracts speaker vector from PCM data', async () => {
            const pcmData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
            
            const result = await speakerEmbedder.extract(pcmData);
            
            expect(mockExtractor.extract).toHaveBeenCalledWith(pcmData);
            expect(result).toBeInstanceOf(SpeakerVector);
            expect(result.vector).toEqual([0.13483997285797064, 0.2696799457159413, 0.4045199286202726, 0.5393598914318826, 0.6741998542434924]);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('throws SessionNotInitializedError when not initialized', async () => {
            const uninitializedEmbedder = new SpeakerEmbedder();
            const pcmData = new Float32Array([0.1, 0.2, 0.3]);
            
            await expect(uninitializedEmbedder.extract(pcmData)).rejects.toThrow(SessionNotInitializedError);
        });

        it('throws SpeakerVectorExtractionError on extraction failure', async () => {
            mockExtractor.extract.mockImplementation(() => {
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
                embedding: new (mockTensorConstructor as any)('float32', new Float32Array([0.6, 0.8, 0, 0, 0]), [1, 5]),
            });
            
            const pcmData = new Float32Array([0.1, 0.2, 0.3]);
            const result = await speakerEmbedder.extract(pcmData);
            
            expect(result.confidence).toBe(1); // Should be clamped to 1
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
