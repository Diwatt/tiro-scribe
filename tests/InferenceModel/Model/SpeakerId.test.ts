import type { AppLogger } from '@/Core/AppLogger';
import { InferenceModelDownloaderException } from '@/Exception';
import type { Downloader } from '@/InferenceModel/Downloader';
import type { DownloadTaskExecutor } from '@/InferenceModel/Download/DownloadTaskExecutor';
import { SpeakerId } from '@/InferenceModel/Model/SpeakerId';
import type { Runtime } from '@/InferenceModel/Runtime';

const CAMPLUS_YAML = `dataset_args:
  fbank_args:
    frame_length: 25
    frame_shift: 10
    num_mel_bins: 80
  resample_rate: 16000
model_args:
  embed_dim: 512
  feat_dim: 80
`;

const createMockLogger = (): AppLogger =>
    ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }) as unknown as AppLogger;

const createMockDownloader = (artifactText: string | null): Downloader =>
    ({
        download: jest.fn().mockResolvedValue({ config: { capability: 'speaker_id' } } as DownloadTaskExecutor),
        ensureDownloaded: jest.fn().mockResolvedValue({ config: { capability: 'speaker_id' } } as DownloadTaskExecutor),
        getArtifactText: jest.fn().mockResolvedValue(artifactText),
    }) as unknown as Downloader;

const createMockRuntime = (runRaw: jest.Mock): Runtime =>
    ({ load: jest.fn().mockResolvedValue(undefined), runRaw }) as unknown as Runtime;

describe('SpeakerId', () => {
    let runRaw: jest.Mock;
    let logger: AppLogger;

    beforeEach(() => {
        runRaw = jest.fn().mockResolvedValue(new Array<number>(512).fill(0.1));
        logger = createMockLogger();
    });

    const createSpeakerId = (artifactText: string | null = CAMPLUS_YAML): SpeakerId =>
        new SpeakerId(createMockDownloader(artifactText), createMockRuntime(runRaw), logger);

    describe('initialize', () => {
        it('parses the downloaded config.yaml into model parameters', async () => {
            const speakerId = createSpeakerId();

            await speakerId.initialize();

            const config = speakerId.getConfig();
            expect(config.embeddingDim).toBe(512);
            expect(config.numMelBins).toBe(80);
            expect(config.sampleRateHz).toBe(16000);
        });

        it('rejects initialization when config.yaml is missing from the artifacts', async () => {
            const speakerId = createSpeakerId(null);

            await expect(speakerId.initialize()).rejects.toThrow(InferenceModelDownloaderException);
            await expect(speakerId.initialize()).rejects.toThrow(/not downloaded/);
        });

        it('requests the config artifact by role from the downloader', async () => {
            const getArtifactText = jest.fn().mockResolvedValue(CAMPLUS_YAML);
            const downloader = {
                ensureDownloaded: jest.fn().mockResolvedValue({}),
                getArtifactText,
            } as unknown as Downloader;
            const speakerId = new SpeakerId(downloader, createMockRuntime(runRaw), logger);

            await speakerId.initialize();

            expect(getArtifactText).toHaveBeenCalledWith('speaker_id', 'config');
        });

        it('rejects initialization when config.yaml is not parseable', async () => {
            const speakerId = createSpeakerId('not: [a: valid: yaml');

            await expect(speakerId.initialize()).rejects.toThrow(InferenceModelDownloaderException);
        });
    });

    describe('run', () => {
        it('shapes the mel features with the parsed numMelBins before inference', async () => {
            const speakerId = createSpeakerId();
            await speakerId.initialize();

            await speakerId.run(new Float32Array(80 * 7));

            expect(runRaw).toHaveBeenCalledTimes(1);
            const [capability, buffer, shape] = runRaw.mock.calls[0] as [string, Float32Array, readonly number[]];
            expect(capability).toBe('speaker_id');
            expect(shape).toEqual([1, 7, 80]);
            expect(buffer.length).toBe(80 * 7);
        });

        it('truncates incomplete trailing frames from the feature buffer', async () => {
            const speakerId = createSpeakerId();
            await speakerId.initialize();

            await speakerId.run(new Float32Array(80 * 7 + 40));

            const [, buffer, shape] = runRaw.mock.calls[0] as [string, Float32Array, readonly number[]];
            expect(shape).toEqual([1, 7, 80]);
            expect(buffer.length).toBe(80 * 7);
        });

        it('throws when features contain no complete frame', async () => {
            const speakerId = createSpeakerId();
            await speakerId.initialize();

            await expect(speakerId.run(new Float32Array(79))).rejects.toThrow(/no complete frames/);
        });

        it('throws when run is called before initialize', async () => {
            const speakerId = createSpeakerId();

            await expect(speakerId.run(new Float32Array(80))).rejects.toThrow(/not initialized/);
        });
    });
});
