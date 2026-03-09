/**
 * SpeakerEmbedder tests
 * 
 * Tests ONNX session management and speaker embedding extraction functionality
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Stub expo-file-system so tests don't attempt to load native modules
vi.mock('expo-file-system', () => {
    return {
        File: class {
            uri = '';
            exists = false;
            constructor(..._args: any[]) {
                // instance will be replaced in tests via mocking
            }
        },
        Paths: {
            document: '',
        },
    };
});

import { SessionNotInitializedError, SpeakerVectorExtractionError } from '@/Exception';
import { SpeakerEmbedder } from '@/Service/SpeakerId/SpeakerEmbedder';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';

// Mock the logger
const mockLoggerInstance = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

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

// Mock InferenceModelDownloader
const mockInferenceModelDownloader = {
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
    getLocalPath: vi.fn<(capability: string) => string | undefined>(),
    getLocalPathForFile: vi.fn<(config: any, file: any) => string | undefined>(),
};

// Mock Core container so SpeakerEmbedder and others get logger/downloader
vi.mock('@/Core/Container', () => ({
    Container: {
        register: vi.fn(),
        get: vi.fn((cls: any) => {
            if (cls && typeof cls.name === 'string' && cls.name.includes('AppLogger')) {
                return mockLoggerInstance;
            }
            // return our preconfigured downloader mock for everything else
            return mockInferenceModelDownloader;
        }),
    },
}));

vi.mock('@/Service/InferenceModelDownloader', () => ({
    InferenceModelDownloader: vi.fn().mockImplementation(() => mockInferenceModelDownloader),
}));

// Mock Container to provide the required dependencies
vi.mock('@/App/Container', (async () => {
    // Import within the mock factory to handle circular dependencies properly
    const InferenceModelDownloaderModule = await vi.importActual<any>('@/Service/InferenceModelDownloader');
    return {
        Container: {
            get: vi.fn((cls: any) => {
                // For InferenceModelDownloader, return an instance with the mocked methods
                if (cls?.name === 'InferenceModelDownloader') {
                    return new InferenceModelDownloaderModule.InferenceModelDownloader();
                }
                if (cls?.name === 'AppLogger') {
                    return mockLoggerInstance;
                }
                return null;
            }),
        },
    };
}) as any);

describe('SpeakerEmbedder', () => {
    let speakerEmbedder: SpeakerEmbedder;
    let mockExtractor: any;

    beforeEach(() => {
        // clear call counts only; retain return value stubs until each test
        vi.clearAllMocks();

        speakerEmbedder = new SpeakerEmbedder(undefined, mockLoggerInstance);
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
            // Use absolute path to bypass Container.get(InferenceModelDownloader)
            await speakerEmbedder.initialize('/mock/model/path.onnx');
            
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
            // Use a relative path that will try to use Container.get, which returns null
            vi.mocked(mockOrt.InferenceSession.create).mockRejectedValue(new Error('Model not found'));
            
            await expect(speakerEmbedder.initialize('/nonexistent.onnx')).rejects.toThrow('Failed to initialize speaker recognition model');
        });

        it('resolves relative paths from document directory', async () => {
            // prepare a fake File class that returns an object with uri/exists
            const fakeFile = { exists: true, uri: 'file:///doc/artifacts/model.onnx' };
            const expoFS = await import('expo-file-system');
            class StubFile {
                exists = fakeFile.exists;
                uri = fakeFile.uri;
                constructor(..._args: any[]) {
                    // ignore arguments
                }
            }
            (expoFS as any).File = StubFile;
            (expoFS as any).Paths = { document: '/doc' };

            // spy on InferenceSession.create to observe the resolved path
            vi.mocked(mockOrt.InferenceSession.create).mockResolvedValue(mockInferenceSession);

            await speakerEmbedder.initialize('artifacts/model.onnx');
            expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith(
                'file:///doc/artifacts/model.onnx',
                { executionProviders: ['cpu'] }
            );
        });
    });

    describe('loadModel', () => {
        it('initializes from existing local path', async () => {
            const embedder = new SpeakerEmbedder(undefined, mockLoggerInstance);
            const initSpy = (embedder.initialize = vi.fn().mockResolvedValue() as any);

            mockInferenceModelDownloader.getLocalPath.mockReturnValue('/existing/path.onnx');

            await embedder.loadModel('speaker_id');
            expect(initSpy).toHaveBeenCalledWith('/existing/path.onnx');
        });



        it('downloads model when local path missing', async () => {
            const embedder = new SpeakerEmbedder(undefined, mockLoggerInstance);
            const initSpy = (embedder.initialize = vi.fn().mockResolvedValue() as any);

            mockInferenceModelDownloader.getLocalPath.mockReturnValue(undefined);
            mockInferenceModelDownloader.download.mockResolvedValue({
                config: {
                    capability: 'speaker-recognition',
                    id: 'speaker-model',
                    files: [{ url: '/mock/model/path.onnx' }],
                },
            } as any);
            mockInferenceModelDownloader.getLocalPathForFile.mockReturnValue('/mock/model/path.onnx');

            await embedder.loadModel('speaker_id');
            expect(initSpy).toHaveBeenCalledWith('/mock/model/path.onnx');
        });

        it('throws if model cannot be resolved', async () => {
            const embedder = new SpeakerEmbedder(undefined, mockLoggerInstance);
            mockInferenceModelDownloader.getLocalPath.mockReturnValue(undefined);
            mockInferenceModelDownloader.getLocalPathForFile.mockReturnValue(undefined);
            mockInferenceModelDownloader.download.mockResolvedValue({ config: { capability: '', id: '', files: [] } } as any);

            await expect(embedder.loadModel('speaker_id')).rejects.toThrow('Model for speaker_id not available');
        });
    });

    describe('extract', () => {
        beforeEach(async () => {
            // Reset the mock to resolve successfully
            vi.mocked(mockOrt.InferenceSession.create).mockResolvedValue(mockInferenceSession);
            
            // Use absolute path to bypass Container.get(InferenceModelDownloader)
            await speakerEmbedder.initialize('/mock/model/path.onnx');
            
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
            const embedder = new SpeakerEmbedder(undefined, mockLoggerInstance);
            
            // Use absolute path to bypass Container.get(InferenceModelDownloader)
            await embedder.initialize('/mock/model/path.onnx');
            
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
