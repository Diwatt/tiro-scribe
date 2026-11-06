import type { DecryptedChunk } from 'secure-recorder';
import { SecureRecorder } from 'secure-recorder';
import { v4 as uuidv4 } from 'uuid';
import type { AppLogger } from '@/Core/AppLogger';
import { Utterance } from '@/Entity';
import type { Asr, Vad } from '@/InferenceModel/Model';
import type { PcmSampleConverter } from '@/Math';
import { PipelineTimings } from './PipelineTimings';
import { SpeechCutter } from './SpeechCutter';
import type { SpeechSegment } from './SpeechSegment';
import { StreamTranscription } from './StreamTranscription';
import { WindowMerger } from './WindowMerger';

/**
 * StreamTranscriber - runs the push pipeline on an encrypted recording:
 * decrypted chunks are framed into VAD windows, speech segments are cut from
 * the VAD probabilities and transcribed into utterances on the absolute
 * sample clock of the stream. One instance can transcribe several streams
 * one after the other; the partial window left at the end of the stream is
 * never inferred.
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
        const merger = new WindowMerger(config.windowSamples);
        const cutter = new SpeechCutter(config.windowSamples, config.sampleRateHz);
        this.vad.reset();

        const timings = new PipelineTimings();
        const speakerLabel = StreamTranscriber.createSpeakerLabel();
        const utterances = await this.pullUtterances(encryptedPath, merger, cutter, speakerLabel, timings);

        merger.takeLeftover();
        const finalSegment = cutter.endOfStream();
        if (finalSegment !== null) {
            utterances.push(await this.transcribeSegment(finalSegment, speakerLabel, timings));
        }

        this.logger.debug('[StreamTranscriber] done', {
            utteranceCount: utterances.length,
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
        merger: WindowMerger,
        cutter: SpeechCutter,
        speakerLabel: string,
        timings: PipelineTimings,
    ): Promise<Utterance[]> {
        const reader = await SecureRecorder.openDecryptedStream(encryptedPath);
        const utterances: Utterance[] = [];
        const pullStartedAt = Date.now();

        try {
            for await (const chunk of reader) {
                utterances.push(...(await this.transcribeChunk(chunk, merger, cutter, speakerLabel, timings)));
            }
        } finally {
            await reader.close();
        }

        timings.addDecrypt(Date.now() - pullStartedAt - timings.getPhasesMs());

        return utterances;
    }

    private async transcribeChunk(
        chunk: DecryptedChunk,
        merger: WindowMerger,
        cutter: SpeechCutter,
        speakerLabel: string,
        timings: PipelineTimings,
    ): Promise<Utterance[]> {
        const convertStartedAt = Date.now();
        const samples = this.sampleConverter.int16ToFloat32(this.sampleConverter.bytesToInt16(chunk.data));
        timings.addConvert(Date.now() - convertStartedAt);

        const utterances: Utterance[] = [];

        for (const window of merger.frame(samples)) {
            const vadStartedAt = Date.now();
            const speechProbability = await this.vad.run(window);
            timings.addVad(Date.now() - vadStartedAt);

            const cutStartedAt = Date.now();
            const segment = cutter.cut(window, speechProbability);
            timings.addCut(Date.now() - cutStartedAt);

            if (segment !== null) {
                utterances.push(await this.transcribeSegment(segment, speakerLabel, timings));
            }
        }

        return utterances;
    }

    private async transcribeSegment(
        segment: SpeechSegment,
        speakerLabel: string,
        timings: PipelineTimings,
    ): Promise<Utterance> {
        const asrStartedAt = Date.now();
        const metric = await this.asr.run(segment.samples);
        timings.addAsr(Date.now() - asrStartedAt);

        return new Utterance(
            uuidv4(),
            segment.startMs,
            segment.endMs,
            metric.text,
            speakerLabel,
            StreamTranscriber.GREEDY_CONFIDENCE,
        );
    }
}
