/**
 * StreamTranscriber Tests - ZOMBIE Methodology
 *
 * Z - Zero: silent stream produces no utterance and never runs the ASR
 * O - One: a single closed segment becomes a single utterance
 * M - Many: segments grouped into one ASR run, tokens re-attributed to segments
 * B - Boundaries: absolute-clock offsets, samples handed to the ASR, input cap
 * I - Interfaces: contract - VAD reset per stream, session speaker label
 * E - Exceptions: model failures propagate out of transcribe
 */

import type { AppLogger } from '@/Core/AppLogger';
import { Asr } from '@/InferenceModel/Model';
import type { Vad } from '@/InferenceModel/Model';
import { AsrRunMetric } from '@/InferenceModel/Model/AsrRunMetric';
import { PcmSampleConverter } from '@/Math';
import { SecureRecorder } from 'secure-recorder';
import type { DecryptedChunk, DecryptedStreamReader } from 'secure-recorder';
import type { StreamTranscription } from '../../src/Pipeline/StreamTranscription';
import { StreamTranscriber } from '../../src/Pipeline/StreamTranscriber';

const WINDOW_SAMPLES = 512;
const SAMPLE_RATE_HZ = 16000;
const WINDOW_MS = 32;
const MAX_INPUT_SAMPLES = (28000 * SAMPLE_RATE_HZ) / 1000;
const SILENCE_AMPLITUDE = 0;
const SPEECH_AMPLITUDE = 1000;
const SILENT_PROBABILITY = 0.1;
const VOICED_PROBABILITY = 0.9;
const TRANSCRIPT_ONE = 'Bonjour, ceci est un test.';
const TRANSCRIPT_TWO = 'Deuxieme segment.';
const TOKEN_ONE = 101;
const TOKEN_TWO = 202;
const ENCODER_FRAME_MS = 80;

type WindowSpec = { amplitude: number; probability: number };
type AsrRun = { readonly tokenIds: number[]; readonly frameIndexes: number[] };

class FakeReader {
    public constructor(private readonly chunks: Uint8Array[]) {}

    public async *[Symbol.asyncIterator](): AsyncGenerator<DecryptedChunk> {
        let data = this.chunks.shift();
        while (data !== undefined) {
            yield { data, isLast: this.chunks.length === 0 };

            data = this.chunks.shift();
        }
    }

    public async close(): Promise<void> {}
}

const makeFakeReader = (chunks: Uint8Array[]): DecryptedStreamReader => new FakeReader(chunks) as unknown as DecryptedStreamReader;

const windowBytes = (amplitude: number): Uint8Array => {
    const samples = new Int16Array(WINDOW_SAMPLES);
    samples.fill(amplitude);

    return new Uint8Array(samples.buffer);
};

const makeChunks = (specs: WindowSpec[], windowsPerChunk: number[]): Uint8Array[] => {
    const chunks: Uint8Array[] = [];
    let offset = 0;

    for (const nbWindows of windowsPerChunk) {
        const part = specs.slice(offset, offset + nbWindows);
        const nbSamples = part.length * WINDOW_SAMPLES;
        const samples = new Int16Array(nbSamples);

        part.forEach((spec, windowIndex) => {
            samples.fill(spec.amplitude, windowIndex * WINDOW_SAMPLES, (windowIndex + 1) * WINDOW_SAMPLES);
        });

        chunks.push(new Uint8Array(samples.buffer));
        offset += nbWindows;
    }

    return chunks;
};

const makeFakeVad = (specs: WindowSpec[]): { getConfig: () => { windowSamples: number; sampleRateHz: number }; reset: jest.Mock; run: jest.Mock } => {
    const script = specs.map((spec) => spec.probability);
    return {
        getConfig: () => ({ windowSamples: WINDOW_SAMPLES, sampleRateHz: SAMPLE_RATE_HZ }),
        reset: jest.fn(),
        run: jest.fn(async () => script.length > 0 ? script.shift() : 0.1),
    };
};

const makeFakeAsr = (runs: AsrRun[]): { run: jest.Mock; decodeTokenIds: jest.Mock } => {
    let callIndex = 0;

    return {
        run: jest.fn(async () => {
            const run = runs[Math.min(callIndex, runs.length - 1)];
            callIndex += 1;

            return AsrRunMetric.create('', run.tokenIds, run.frameIndexes, 1, 1, 1, 3, 1, 1);
        }),
        decodeTokenIds: jest.fn((tokenIds: readonly number[]) => {
            if (tokenIds.includes(TOKEN_ONE)) {
                return TRANSCRIPT_ONE;
            }
            if (tokenIds.includes(TOKEN_TWO)) {
                return TRANSCRIPT_TWO;
            }

            return '';
        }),
    };
};

const silentSpecs = (nbWindows: number): WindowSpec[] =>
    Array.from({ length: nbWindows }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY }));

const voicedSpecs = (nbWindows: number): WindowSpec[] =>
    Array.from({ length: nbWindows }, () => ({ amplitude: SPEECH_AMPLITUDE, probability: VOICED_PROBABILITY }));

async function transcribeSpecs(
    specs: WindowSpec[],
    windowsPerChunk: number[],
    runs: AsrRun[],
    tailSamples?: number,
): Promise<{
    transcriber: StreamTranscriber;
    transcription: StreamTranscription;
    vad: ReturnType<typeof makeFakeVad>;
    asr: ReturnType<typeof makeFakeAsr>;
}> {
    const vad = makeFakeVad(specs);
    const asr = makeFakeAsr(runs);
    const chunks = makeChunks(specs, windowsPerChunk);

    if (tailSamples !== undefined) {
        const tailSamplesArray = new Int16Array(tailSamples);
        tailSamplesArray.fill(SILENCE_AMPLITUDE);
        chunks.push(new Uint8Array(tailSamplesArray.buffer));
    }

    jest.spyOn(SecureRecorder, 'openDecryptedStream').mockResolvedValue(makeFakeReader(chunks));
    const transcriber = new StreamTranscriber(
        vad as unknown as Vad,
        asr as unknown as Asr,
        new PcmSampleConverter(),
        { debug: jest.fn(), error: jest.fn() } as unknown as AppLogger,
    );

    const transcription = await transcriber.transcribe('/fixtures/session.dat');

    return { transcriber, transcription, vad, asr };
}

describe('StreamTranscriber - ZOMBIE Tests', () => {
    describe('Z - Zero Tests', () => {
        it('should return no utterance on a fully silent stream and never run the ASR', async () => {
            const specs = silentSpecs(100);

            const { transcription, asr } = await transcribeSpecs(specs, [100], []);

            expect(transcription.utterances).toEqual([]);
            expect(asr.run).not.toHaveBeenCalled();
        });
    });

    describe('O - One Tests', () => {
        it('should transcribe one closed segment with absolute-clock boundaries', async () => {
            const specs = [
                ...silentSpecs(60),
                ...voicedSpecs(100),
                ...silentSpecs(3),
            ];

            const { transcription, asr } = await transcribeSpecs(specs, [80, 83], [
                { tokenIds: [TOKEN_ONE, TOKEN_ONE], frameIndexes: [0, 1] },
            ]);

            expect(transcription.utterances.length).toBe(1);
            expect(transcription.utterances[0].startTime).toBe(50 * WINDOW_MS);
            expect(transcription.utterances[0].endTime).toBe(163 * WINDOW_MS);
            expect(transcription.utterances[0].text).toBe(TRANSCRIPT_ONE);
            expect(transcription.utterances[0].speakerLabel).toMatch(/^spk_[a-z0-9]{4}$/);
            expect(transcription.utterances[0].confidence).toBe(1);
            expect(asr.run).toHaveBeenCalledTimes(1);
            const transcribedSamples = asr.run.mock.calls[0][0] as Float32Array;
            expect(transcribedSamples.length).toBe(113 * WINDOW_SAMPLES);
        });

        it('should return cumulative pipeline timings', async () => {
            const specs = [
                ...silentSpecs(60),
                ...voicedSpecs(100),
                ...silentSpecs(3),
            ];

            const { transcription } = await transcribeSpecs(specs, [163], [
                { tokenIds: [TOKEN_ONE], frameIndexes: [0] },
            ]);

            expect(transcription.timings.getDecryptMs()).toBeGreaterThanOrEqual(0);
            expect(transcription.timings.getConvertMs()).toBeGreaterThanOrEqual(0);
            expect(transcription.timings.getVadMs()).toBeGreaterThanOrEqual(0);
            expect(transcription.timings.getCutMs()).toBeGreaterThanOrEqual(0);
            expect(transcription.timings.getAsrMs()).toBeGreaterThanOrEqual(0);
            expect(transcription.timings.getTotalMs()).toBeGreaterThanOrEqual(transcription.timings.getAsrMs());
        });

        it('should emit the trailing open segment at end of stream', async () => {
            const specs = [
                ...silentSpecs(60),
                ...voicedSpecs(100),
            ];

            const { transcription } = await transcribeSpecs(specs, [160], [
                { tokenIds: [TOKEN_ONE], frameIndexes: [0] },
            ]);

            expect(transcription.utterances.length).toBe(1);
            expect(transcription.utterances[0].startTime).toBe(50 * WINDOW_MS);
            expect(transcription.utterances[0].endTime).toBe(160 * WINDOW_MS);
        });
    });

    describe('M - Many Tests', () => {
        it('should group successive segments into one ASR run and re-attribute tokens to each segment', async () => {
            const specs = [
                ...silentSpecs(60),
                ...voicedSpecs(100),
                ...silentSpecs(3),
                ...silentSpecs(20),
                ...voicedSpecs(80),
                ...silentSpecs(3),
            ];

            const { transcription, asr } = await transcribeSpecs(specs, [123, 123, 123], [
                { tokenIds: [TOKEN_ONE, TOKEN_TWO], frameIndexes: [0, 90] },
            ]);
            const utterances = transcription.utterances;

            expect(asr.run).toHaveBeenCalledTimes(1);
            expect(asr.run.mock.calls[0][0] as Float32Array).toHaveLength(206 * WINDOW_SAMPLES);
            expect(utterances.length).toBe(2);
            expect(utterances[0].startTime).toBe(50 * WINDOW_MS);
            expect(utterances[0].endTime).toBe(163 * WINDOW_MS);
            expect(utterances[0].text).toBe(TRANSCRIPT_ONE);
            expect(utterances[1].startTime).toBe(173 * WINDOW_MS);
            expect(utterances[1].endTime).toBe(266 * WINDOW_MS);
            expect(utterances[1].text).toBe(TRANSCRIPT_TWO);
            expect(utterances[0].speakerLabel).toBe(utterances[1].speakerLabel);
            expect(utterances[0].id).not.toBe(utterances[1].id);
        });

        it('should emit one utterance per segment of the final run input', async () => {
            const specs = [
                ...silentSpecs(60),
                ...voicedSpecs(100),
                ...silentSpecs(3),
                ...silentSpecs(20),
                ...voicedSpecs(80),
                ...silentSpecs(3),
            ];

            const { transcription } = await transcribeSpecs(specs, [286], [
                { tokenIds: [TOKEN_ONE, TOKEN_TWO], frameIndexes: [0, 90] },
            ]);

            expect(transcription.utterances.length).toBe(2);
        });

        it('should drop the leftover samples that never filled a whole window', async () => {
            const specs = [
                ...silentSpecs(60),
                ...voicedSpecs(100),
                ...silentSpecs(3),
            ];

            const { transcription, vad } = await transcribeSpecs(specs, [120, 43], [
                { tokenIds: [TOKEN_ONE], frameIndexes: [0] },
            ], 100);

            expect(transcription.utterances.length).toBe(1);
            expect(vad.run).toHaveBeenCalledTimes(163);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should emit one ASR run per full input on continuous voice past the input cap', async () => {
            const specs = [
                ...silentSpecs(60),
                ...voicedSpecs(940),
            ];

            const { transcription, asr } = await transcribeSpecs(specs, [500, 500], [
                { tokenIds: [TOKEN_ONE], frameIndexes: [0] },
                { tokenIds: [TOKEN_TWO], frameIndexes: [0] },
            ]);
            const utterances = transcription.utterances;

            expect(asr.run).toHaveBeenCalledTimes(2);
            const firstRunInputSamples = asr.run.mock.calls[0][0] as Float32Array;
            expect(firstRunInputSamples.length).toBeLessThanOrEqual(MAX_INPUT_SAMPLES);
            expect(utterances.length).toBe(2);
            expect(utterances[0].startTime).toBe(50 * WINDOW_MS);
            expect(utterances[0].endTime).toBe(925 * WINDOW_MS);
            expect(utterances[0].endTime - utterances[0].startTime).toBe(28000);
            expect(utterances[0].text).toBe(TRANSCRIPT_ONE);
            expect(utterances[1].startTime).toBe(925 * WINDOW_MS);
            expect(utterances[1].text).toBe(TRANSCRIPT_TWO);
        });

        it('should reset the VAD state at the start of every stream', async () => {
            const specs = [
                ...silentSpecs(60),
                ...voicedSpecs(100),
                ...silentSpecs(3),
            ];
            const vad = makeFakeVad(specs);
            const asr = makeFakeAsr([{ tokenIds: [TOKEN_ONE], frameIndexes: [0] }]);
            jest.spyOn(SecureRecorder, 'openDecryptedStream').mockResolvedValue(makeFakeReader(makeChunks(specs, [163])));
            const transcriber = new StreamTranscriber(
                vad as unknown as Vad,
                asr as unknown as Asr,
                new PcmSampleConverter(),
                { debug: jest.fn(), error: jest.fn() } as unknown as AppLogger,
            );

            await transcriber.transcribe('/fixtures/first.dat');
            await transcriber.transcribe('/fixtures/second.dat');

            expect(vad.reset).toHaveBeenCalledTimes(2);
        });
    });

    describe('E - Exception Tests', () => {
        it('should let VAD failures propagate out of transcribe', async () => {
            const vad = makeFakeVad([]);
            vad.run.mockRejectedValueOnce(new Error('VAD bundle failure'));
            const asr = makeFakeAsr([{ tokenIds: [TOKEN_ONE], frameIndexes: [0] }]);
            jest.spyOn(SecureRecorder, 'openDecryptedStream').mockResolvedValue(
                makeFakeReader(makeChunks([{ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY }], [1])),
            );
            const transcriber = new StreamTranscriber(
                vad as unknown as Vad,
                asr as unknown as Asr,
                new PcmSampleConverter(),
                { debug: jest.fn(), error: jest.fn() } as unknown as AppLogger,
            );

            await expect(transcriber.transcribe('/fixtures/broken.dat')).rejects.toThrow('VAD bundle failure');
        });
    });
});
