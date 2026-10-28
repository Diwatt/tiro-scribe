jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

import { SpeechToTextBenchmark } from '@/DevConsole/SpeechToTextBenchmark';
import type { SpeechToTextRunner, SpeechToTextRunnerFactory } from '@/DevConsole/SpeechToTextBenchmark';
import { AudioSegmentExtractor } from '@/DevConsole/AudioSegmentExtractor';
import { AppLogger } from '@/Core/AppLogger';

const WAV_PATH = '/Documents/gloria_rogers_01.wav';

function createFakeExtractor(samples: number): AudioSegmentExtractor {
    return {
        readFullPcm: jest.fn().mockResolvedValue(new Float32Array(samples).fill(0.25)),
    } as unknown as AudioSegmentExtractor;
}

function createFakeRunner(transcript: string): SpeechToTextRunner {
    return {
        transcribe: jest.fn().mockResolvedValue(transcript),
        dispose: jest.fn().mockResolvedValue(undefined),
    };
}

function createBenchmark(
    extractor: AudioSegmentExtractor,
    runner: SpeechToTextRunner,
): SpeechToTextBenchmark {
    const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as AppLogger;
    const factory: SpeechToTextRunnerFactory = { create: jest.fn().mockResolvedValue(runner) };
    return new SpeechToTextBenchmark(logger, extractor, factory);
}

describe('SpeechToTextBenchmark', () => {
    it('starts with an empty snapshot and is not loading', () => {
        const benchmark = createBenchmark(createFakeExtractor(16000), createFakeRunner('hello'));

        expect(benchmark.isLoading).toBe(false);
        expect(benchmark.snapshot.result).toBeNull();
        expect(benchmark.snapshot.error).toBeNull();
    });

    it('reads the wav through the segment extractor and transcribes it', async () => {
        const extractor = createFakeExtractor(16000);
        const runner = createFakeRunner('hello world');
        const benchmark = createBenchmark(extractor, runner);

        await benchmark.run(WAV_PATH, 'en');

        expect(extractor.readFullPcm).toHaveBeenCalledWith(WAV_PATH);
        expect(runner.transcribe).toHaveBeenCalledWith(expect.any(Float32Array), 'en');
        expect(benchmark.snapshot.result?.transcript).toBe('hello world');
    });

    it('computes audio duration and RTF from the pcm length at 16 kHz', async () => {
        const benchmark = createBenchmark(createFakeExtractor(32000), createFakeRunner('hello'));

        await benchmark.run(WAV_PATH, 'en');

        expect(benchmark.snapshot.result?.audioDurationMs).toBe(2000);
        expect(benchmark.snapshot.result?.rtf).toBeGreaterThanOrEqual(0);
    });

    it('disposes the runner after transcription', async () => {
        const runner = createFakeRunner('hello');
        const benchmark = createBenchmark(createFakeExtractor(16000), runner);

        await benchmark.run(WAV_PATH, 'en');

        expect(runner.dispose).toHaveBeenCalled();
        expect(benchmark.isLoading).toBe(false);
    });

    it('rejects an empty language', async () => {
        const benchmark = createBenchmark(createFakeExtractor(16000), createFakeRunner('hello'));

        await expect(benchmark.run(WAV_PATH, '')).rejects.toThrow('Language is required');
    });

    it('rejects empty audio without calling the runner', async () => {
        const runner = createFakeRunner('hello');
        const benchmark = createBenchmark(createFakeExtractor(0), runner);

        await expect(benchmark.run(WAV_PATH, 'en')).rejects.toThrow('Audio is empty');
        expect(runner.transcribe).not.toHaveBeenCalled();
    });

    it('reports the error and stops loading when transcription fails', async () => {
        const failingRunner: SpeechToTextRunner = {
            transcribe: jest.fn().mockRejectedValue(new Error('decode failed')),
            dispose: jest.fn().mockResolvedValue(undefined),
        };
        const benchmark = createBenchmark(createFakeExtractor(16000), failingRunner);

        await expect(benchmark.run(WAV_PATH, 'en')).rejects.toThrow('decode failed');

        expect(benchmark.snapshot.error).toContain('decode failed');
        expect(benchmark.snapshot.result).toBeNull();
        expect(benchmark.isLoading).toBe(false);
    });
});
