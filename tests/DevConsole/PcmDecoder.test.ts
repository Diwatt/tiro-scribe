jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

import { AppLogger } from '@/Core/AppLogger';
import { PcmDecoder } from '@/DevConsole/Ingest/PcmDecoder';
import { PcmSampleConverter } from '@/DevConsole/Ingest/PcmSampleConverter';
import { SourceIngestException } from '@/DevConsole/Ingest/SourceIngestException';

const createLogger = (): AppLogger =>
    ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }) as unknown as AppLogger;

const buildWavBytes = (channels: number, sampleRate: number, samples: number[]): Uint8Array => {
    const dataSize = samples.length * 2;
    const bytes = new Uint8Array(44 + dataSize);
    const view = new DataView(bytes.buffer);
    const writeAscii = (offset: number, text: string): void => {
        for (let i = 0; i < text.length; i++) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    };

    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeAscii(36, 'data');
    view.setUint32(40, dataSize, true);
    samples.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true));

    return bytes;
};

const buildRawPcmBytes = (samples: number[]): Uint8Array => {
    const int16 = Int16Array.from(samples);
    return new Uint8Array(int16.buffer);
};

describe('PcmDecoder', () => {
    describe('decode', () => {
        it('decodes a mono 16 kHz WAV to normalized float PCM', () => {
            const decoder = new PcmDecoder(createLogger(), new PcmSampleConverter());

            const pcm = decoder.decode(buildWavBytes(1, 16000, [0, 16384, -16384]), '/audio/mono.wav');

            expect(Array.from(pcm)).toEqual([0, 0.5, -0.5]);
        });

        it('mixes a stereo WAV to mono', () => {
            const decoder = new PcmDecoder(createLogger(), new PcmSampleConverter());

            const pcm = decoder.decode(buildWavBytes(2, 16000, [16384, 0, -16384, 16384]), '/audio/stereo.wav');

            expect(Array.from(pcm)).toEqual([0.25, 0]);
        });

        it('resamples a WAV recorded at another rate to 16 kHz', () => {
            const decoder = new PcmDecoder(createLogger(), new PcmSampleConverter());

            const pcm = decoder.decode(buildWavBytes(1, 8000, [16384, 0]), '/audio/8k.wav');

            expect(Array.from(pcm)).toEqual([0.5, 0.25, 0, 0]);
        });

        it('decodes raw .pcm bytes as little-endian int16 mono', () => {
            const decoder = new PcmDecoder(createLogger(), new PcmSampleConverter());

            const pcm = decoder.decode(buildRawPcmBytes([16384, 0]), '/audio/raw.pcm');

            expect(Array.from(pcm)).toEqual([0.5, 0]);
        });

        it('rejects bytes that are neither WAV nor a raw PCM extension', () => {
            const decoder = new PcmDecoder(createLogger(), new PcmSampleConverter());
            const unknownBytes = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

            expect(() => decoder.decode(unknownBytes, '/audio/file.txt')).toThrow(SourceIngestException);
            expect(() => decoder.decode(unknownBytes, '/audio/file.txt')).toThrow(/UNSUPPORTED_AUDIO_FORMAT|Unsupported audio format/);
        });
    });
});
