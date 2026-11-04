jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

import { AppLogger } from '@/Core/AppLogger';
import { AudioSegment } from '@/DevConsole/Data/AudioSegment';
import { AudioSegmentExtractor } from '@/DevConsole/Ingest/AudioSegmentExtractor';

const createLogger = (): AppLogger =>
    ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }) as unknown as AppLogger;

const createExtractor = (
    pcm: Float32Array,
): { extractor: AudioSegmentExtractor; readBytes: jest.Mock; decode: jest.Mock } => {
    const readBytes = jest.fn().mockResolvedValue(new Uint8Array(8));
    const decode = jest.fn().mockReturnValue(pcm);
    const logger = createLogger();
    const extractor = new AudioSegmentExtractor(logger, { readBytes } as never, { decode } as never);
    return { extractor, readBytes, decode };
};

describe('AudioSegmentExtractor', () => {
    describe('extract', () => {
        it('returns the sample window matching the segment', async () => {
            const fullPcm = Float32Array.from({ length: 32_000 }, (_, i) => i / 32_000);
            const { extractor } = createExtractor(fullPcm);

            const segmentPcm = await extractor.extract('/audio/file.wav', new AudioSegment(1000, 2000));

            expect(segmentPcm.length).toBe(16_000);
            expect(segmentPcm[0]).toBe(fullPcm[16_000]);
        });

        it('rejects a segment starting beyond the available samples', async () => {
            const { extractor } = createExtractor(Float32Array.from({ length: 1_000 }, () => 0));

            await expect(extractor.extract('/audio/file.wav', new AudioSegment(1000, 2000))).rejects.toThrow(
                'Segment starts at sample 16000 but audio only has 1000 samples',
            );
        });

        it('clamps the window to the real end and warns when most of it is missing', async () => {
            const fullPcm = Float32Array.from({ length: 20_000 }, (_, i) => i / 20_000);
            const { extractor } = createExtractor(fullPcm);
            const warn = (extractor as unknown as { logger: AppLogger }).logger.warn;

            const segmentPcm = await extractor.extract('/audio/file.wav', new AudioSegment(1000, 2000));

            expect(segmentPcm.length).toBe(4_000);
            expect(warn).toHaveBeenCalledTimes(1);
        });
    });

    describe('readFullPcm', () => {
        it('reads the file bytes and decodes them', async () => {
            const { extractor, readBytes, decode } = createExtractor(Float32Array.from([0.5]));

            const pcm = await extractor.readFullPcm('/audio/file.wav');

            expect(readBytes).toHaveBeenCalledWith('/audio/file.wav');
            expect(decode).toHaveBeenCalledWith(expect.any(Uint8Array), '/audio/file.wav');
            expect(pcm).toEqual(Float32Array.from([0.5]));
        });
    });
});
