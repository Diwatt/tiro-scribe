import type { DecryptedChunk } from 'secure-recorder';
import { SecureRecorder } from 'secure-recorder';
import { v4 as uuidv4 } from 'uuid';
import type { AppLogger } from '@/Core/AppLogger';
import { Utterance } from '@/Entity';
import type { Vad } from '@/InferenceModel/Model';
import { Asr } from '@/InferenceModel/Model';
import type { PcmSampleConverter } from '@/Math';
import type { AsrRunInput } from './AsrRunInput';
import { AsrRunInputBuilder } from './AsrRunInputBuilder';
import { AudioCutter } from './AudioCutter';
import { PipelineTimings } from './PipelineTimings';
import { StreamTranscription } from './StreamTranscription';
import { VadWindowFramer } from './VadWindowFramer';

/**
 * StreamTranscriber - runs the pull pipeline on an encrypted recording:
 * decrypted chunks are framed into VAD windows, the AudioCutter cuts voice
 * segments and the AsrRunInputBuilder builds ASR run inputs, one ASR run per
 * input; the tokens are then re-attributed to their original segments so
 * every utterance keeps its absolute stream-time boundaries. One instance can
 * transcribe several streams one after the other; the partial window left at
 * the end of the stream is never inferred.
 */
export class StreamTranscriber {
    public static readonly GREEDY_CONFIDENCE = 1;

    private readonly asr: Asr;
    private readonly logger: AppLogger;
    private readonly sampleConverter: PcmSampleConverter;
    private readonly vad: Vad;

    public constructor(vad: Vad, asr: Asr, sampleConverter: PcmSampleConverter, logger: AppLogger) {
        this.vad = vad;
        this.asr = asr;
        this.sampleConverter = sampleConverter;
        this.logger = logger;
    }

    public async transcribe(encryptedPath: string): Promise<StreamTranscription> {
        const config = this.vad.getConfig();
        const framer = new VadWindowFramer(config.windowSamples);
        const builder = new AsrRunInputBuilder(config.windowSamples, config.sampleRateHz);
        const cutter = new AudioCutter(config.windowSamples, config.sampleRateHz, builder);
        this.vad.reset();

        const timings = new PipelineTimings();
        const speakerLabel = StreamTranscriber.createSpeakerLabel();
        const utterances = await this.pullUtterances(encryptedPath, framer, cutter, speakerLabel, timings);

        framer.takeLeftover();
        const finalInput = cutter.endOfStream();
        if (finalInput !== null) {
            utterances.push(...(await this.transcribeRunInput(finalInput, speakerLabel, timings)));
        }

        this.logger.debug('[StreamTranscriber] done', {
            nbUtterances: utterances.length,
            speakerLabel,
            decryptMs: timings.getDecryptMs(),
            convertMs: timings.getConvertMs(),
            vadMs: timings.getVadMs(),
            cutMs: timings.getCutMs(),
            asrMs: timings.getAsrMs(),
        });

        return StreamTranscription.create(utterances, timings);
    }

    private static createSpeakerLabel(): string {
        return `spk_${Math.random().toString(36).slice(2, 6)}`;
    }

    private async pullUtterances(
        encryptedPath: string,
        framer: VadWindowFramer,
        cutter: AudioCutter,
        speakerLabel: string,
        timings: PipelineTimings,
    ): Promise<Utterance[]> {
        const reader = await SecureRecorder.openDecryptedStream(encryptedPath);
        const utterances: Utterance[] = [];
        const pullStartedAt = Date.now();

        try {
            for await (const chunk of reader) {
                utterances.push(...(await this.transcribeChunk(chunk, framer, cutter, speakerLabel, timings)));
            }
        } finally {
            await reader.close();
        }

        timings.addDecrypt(Date.now() - pullStartedAt - timings.getPhasesMs());

        return utterances;
    }

    private async transcribeChunk(
        chunk: DecryptedChunk,
        framer: VadWindowFramer,
        cutter: AudioCutter,
        speakerLabel: string,
        timings: PipelineTimings,
    ): Promise<Utterance[]> {
        const convertStartedAt = Date.now();
        const samples = this.sampleConverter.int16ToFloat32(this.sampleConverter.bytesToInt16(chunk.data));
        timings.addConvert(Date.now() - convertStartedAt);

        const utterances: Utterance[] = [];

        for (const window of framer.frame(samples)) {
            const vadStartedAt = Date.now();
            const speechProbability = await this.vad.run(window);
            timings.addVad(Date.now() - vadStartedAt);

            const cutStartedAt = Date.now();
            const input = cutter.cut(window, speechProbability);
            timings.addCut(Date.now() - cutStartedAt);

            if (input !== null) {
                utterances.push(...(await this.transcribeRunInput(input, speakerLabel, timings)));
            }
        }

        return utterances;
    }

    private async transcribeRunInput(
        input: AsrRunInput,
        speakerLabel: string,
        timings: PipelineTimings,
    ): Promise<Utterance[]> {
        const asrStartedAt = Date.now();
        const metric = await this.asr.run(input.getSamples());
        timings.addAsr(Date.now() - asrStartedAt);

        const segmentBuckets = input.getSegments().map((): number[] => []);
        metric.tokenIds.forEach((tokenId, tokenIndex) => {
            const frameIndex = metric.frameIndexes[tokenIndex] * Asr.ENCODER_FRAME_MS;
            segmentBuckets[input.segmentIndexAt(input.absoluteMsAt(frameIndex))].push(tokenId);
        });

        return input
            .getSegments()
            .map(
                (segment, segmentIndex) =>
                    new Utterance(
                        uuidv4(),
                        segment.startMs,
                        segment.endMs,
                        this.asr.decodeTokenIds(segmentBuckets[segmentIndex]),
                        speakerLabel,
                        StreamTranscriber.GREEDY_CONFIDENCE,
                    ),
            );
    }
}
