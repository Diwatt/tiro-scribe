/**
 * StreamTranscriber Tests - ZOMBIE Methodology
 *
 * Z - Zero: silent stream produces no utterance
 * O - One: a single closed segment becomes a single utterance
 * M - Many: successive segments, irregular chunks, leftover tail
 * B - Boundaries: absolute-clock offsets, samples handed to the ASR
 * I - Interfaces: contract - VAD reset per stream, session speaker label
 * E - Exceptions: model failures propagate out of transcribe
 */

import { Utterance } from '@/Entity';
import type { AppLogger } from '@/Core/AppLogger';
import type { Asr, Vad } from '@/InferenceModel/Model';
import { SecureRecorder } from 'secure-recorder';
import type { DecryptedChunk, DecryptedStreamReader } from 'secure-recorder';
import { AsrRunMetric } from '@/InferenceModel/Model/AsrRunMetric';
import { PcmSampleConverter } from '@/Math';
import { StreamTranscriber } from '../../src/Pipeline/StreamTranscriber';

const WINDOW_SAMPLES = 512;
const SAMPLE_RATE_HZ = 16000;
const WINDOW_MS = 32;
const SILENCE_AMPLITUDE = 0;
const SPEECH_AMPLITUDE = 1000;
const SILENT_PROBABILITY = 0.1;
const VOICED_PROBABILITY = 0.9;
const TRANSCRIPT_ONE = 'Bonjour, ceci est un test.';
const TRANSCRIPT_TWO = 'Deuxieme segment.';

type WindowSpec = { amplitude: number; probability: number };

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

function makeFakeReader(chunks: Uint8Array[]): DecryptedStreamReader {
    return new FakeReader(chunks) as unknown as DecryptedStreamReader;
}

function windowBytes(amplitude: number): Uint8Array {
    const samples = new Int16Array(WINDOW_SAMPLES);
    samples.fill(amplitude);

    return new Uint8Array(samples.buffer);
}

function makeChunks(specs: WindowSpec[], windowsPerChunk: number[]): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    let offset = 0;

    for (const windowCount of windowsPerChunk) {
        const part = specs.slice(offset, offset + windowCount);
        const sampleCount = part.length * WINDOW_SAMPLES;
        const samples = new Int16Array(sampleCount);

        part.forEach((spec, windowIndex) => {
            samples.fill(spec.amplitude, windowIndex * WINDOW_SAMPLES, (windowIndex + 1) * WINDOW_SAMPLES);
        });

        chunks.push(new Uint8Array(samples.buffer));
        offset += windowCount;
    }

    return chunks;
}

function makeFakeVad(specs: WindowSpec[]): { getConfig: () => { windowSamples: number; sampleRateHz: number }; reset: jest.Mock; run: jest.Mock } {
    const script = specs.map((spec) => spec.probability);
    return {
        getConfig: () => ({ windowSamples: WINDOW_SAMPLES, sampleRateHz: SAMPLE_RATE_HZ }),
        reset: jest.fn(),
        run: jest.fn(async () => script.length > 0 ? script.shift() : 0.1),
    };
}

function makeFakeAsr(transcripts: string[]): { run: jest.Mock } {
    let callIndex = 0;

    return {
        run: jest.fn(async () => {
            const transcript = transcripts[Math.min(callIndex, transcripts.length - 1)] ?? '';
            callIndex += 1;

            return AsrRunMetric.create(transcript, 1, 1, 1, 3, 1, 1, 1);
        }),
    };
}

async function transcribeSpecs(
    specs: WindowSpec[],
    windowsPerChunk: number[],
    tailSamples?: number,
): Promise<{
    transcriber: StreamTranscriber;
    utterances: Utterance[];
    vad: ReturnType<typeof makeFakeVad>;
    asr: ReturnType<typeof makeFakeAsr>;
}> {
    const vad = makeFakeVad(specs);
    const asr = makeFakeAsr([TRANSCRIPT_ONE, TRANSCRIPT_TWO]);
    const chunkSpecs = specs.slice();
    const chunks = makeChunks(chunkSpecs, windowsPerChunk);

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

    const utterances = await transcriber.transcribe('/fixtures/session.dat');

    return { transcriber, utterances, vad, asr };
}

describe('StreamTranscriber - ZOMBIE Tests', () => {
    describe('Z - Zero Tests', () => {
        it('should return no utterance on a fully silent stream', async () => {
            const specs = Array.from({ length: 100 }, () => ({
                amplitude: SILENCE_AMPLITUDE,
                probability: SILENT_PROBABILITY,
            }));

            const { utterances } = await transcribeSpecs(specs, [100]);

            expect(utterances).toEqual([]);
        });
    });

    describe('O - One Tests', () => {
        it('should transcribe one closed segment with absolute-clock boundaries', async () => {
            const specs = [
                ...Array.from({ length: 60 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
                ...Array.from({ length: 100 }, () => ({ amplitude: SPEECH_AMPLITUDE, probability: VOICED_PROBABILITY })),
                ...Array.from({ length: 3 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
            ];

            const { utterances, asr } = await transcribeSpecs(specs, [80, 83]);

            expect(utterances.length).toBe(1);
            expect(utterances[0].startTime).toBe(50 * WINDOW_MS);
            expect(utterances[0].endTime).toBe(163 * WINDOW_MS);
            expect(utterances[0].text).toBe(TRANSCRIPT_ONE);
            expect(utterances[0].speakerLabel).toMatch(/^spk_[a-z0-9]{4}$/);
            expect(utterances[0].confidence).toBe(1);
            expect(asr.run).toHaveBeenCalledTimes(1);
            const transcribedSamples = asr.run.mock.calls[0][0] as Float32Array;
            expect(transcribedSamples.length).toBe(113 * WINDOW_SAMPLES);
        });

        it('should emit the trailing open segment at end of stream', async () => {
            const specs = [
                ...Array.from({ length: 60 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
                ...Array.from({ length: 100 }, () => ({ amplitude: SPEECH_AMPLITUDE, probability: VOICED_PROBABILITY })),
            ];

            const { utterances } = await transcribeSpecs(specs, [160]);

            expect(utterances.length).toBe(1);
            expect(utterances[0].startTime).toBe(50 * WINDOW_MS);
            expect(utterances[0].endTime).toBe(160 * WINDOW_MS);
        });
    });

    describe('M - Many Tests', () => {
        it('should emit successive segments in stream order with a shared speaker label', async () => {
            const specs = [
                ...Array.from({ length: 60 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
                ...Array.from({ length: 100 }, () => ({ amplitude: SPEECH_AMPLITUDE, probability: VOICED_PROBABILITY })),
                ...Array.from({ length: 3 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
                ...Array.from({ length: 80 }, () => ({ amplitude: SPEECH_AMPLITUDE, probability: VOICED_PROBABILITY })),
                ...Array.from({ length: 3 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
            ];

            const { utterances } = await transcribeSpecs(specs, [123, 123, 123]);

            expect(utterances.length).toBe(2);
            expect(utterances[0].endTime).toBeLessThanOrEqual(utterances[1].startTime);
            expect(utterances[0].speakerLabel).toBe(utterances[1].speakerLabel);
            expect(utterances[0].id).not.toBe(utterances[1].id);
            expect(utterances[1].text).toBe(TRANSCRIPT_TWO);
        });

        it('should drop the leftover samples that never filled a whole window', async () => {
            const specs = [
                ...Array.from({ length: 60 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
                ...Array.from({ length: 100 }, () => ({ amplitude: SPEECH_AMPLITUDE, probability: VOICED_PROBABILITY })),
                ...Array.from({ length: 3 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
            ];

            const { utterances, vad } = await transcribeSpecs(specs, [120, 43], 100);

            expect(utterances.length).toBe(1);
            expect(vad.run).toHaveBeenCalledTimes(163);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should reset the VAD state at the start of every stream', async () => {
            const specs = [
                ...Array.from({ length: 60 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
                ...Array.from({ length: 100 }, () => ({ amplitude: SPEECH_AMPLITUDE, probability: VOICED_PROBABILITY })),
                ...Array.from({ length: 3 }, () => ({ amplitude: SILENCE_AMPLITUDE, probability: SILENT_PROBABILITY })),
            ];
            const vad = makeFakeVad(specs);
            const asr = makeFakeAsr([TRANSCRIPT_ONE]);
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
            const asr = makeFakeAsr([TRANSCRIPT_ONE]);
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
