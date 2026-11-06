import type { DecryptedChunk } from 'secure-recorder';
import { SecureRecorder } from 'secure-recorder';
import { v4 as uuidv4 } from 'uuid';
import type { AppLogger } from '@/Core/AppLogger';
import { Utterance } from '@/Entity';
import type { Asr, Vad } from '@/InferenceModel/Model';
import type { PcmSampleConverter } from '@/Math';
import { SpeechCutter } from './SpeechCutter';
import type { SpeechSegment } from './SpeechSegment';
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

    public async transcribe(encryptedPath: string): Promise<Utterance[]> {
        const config = this.vad.getConfig();
        const merger = new WindowMerger(config.windowSamples);
        const cutter = new SpeechCutter(config.windowSamples, config.sampleRateHz);
        this.vad.reset();

        const speakerLabel = StreamTranscriber.createSpeakerLabel();
        const utterances = await this.pullUtterances(encryptedPath, merger, cutter, speakerLabel);

        merger.takeLeftover();
        const finalSegment = cutter.endOfStream();
        if (finalSegment !== null) {
            utterances.push(await this.transcribeSegment(finalSegment, speakerLabel));
        }

        this.logger.debug('[StreamTranscriber] done', {
            utteranceCount: utterances.length,
            speakerLabel,
        });

        return utterances;
    }

    private static createSpeakerLabel(): string {
        return `spk_${Math.random().toString(36).slice(2, 6)}`;
    }

    private async pullUtterances(
        encryptedPath: string,
        merger: WindowMerger,
        cutter: SpeechCutter,
        speakerLabel: string,
    ): Promise<Utterance[]> {
        const reader = await SecureRecorder.openDecryptedStream(encryptedPath);
        const utterances: Utterance[] = [];

        try {
            for await (const chunk of reader) {
                utterances.push(...(await this.transcribeChunk(chunk, merger, cutter, speakerLabel)));
            }
        } finally {
            await reader.close();
        }

        return utterances;
    }

    private async transcribeChunk(
        chunk: DecryptedChunk,
        merger: WindowMerger,
        cutter: SpeechCutter,
        speakerLabel: string,
    ): Promise<Utterance[]> {
        const samples = this.sampleConverter.int16ToFloat32(this.sampleConverter.bytesToInt16(chunk.data));
        const utterances: Utterance[] = [];

        for (const window of merger.frame(samples)) {
            const speechProbability = await this.vad.run(window);
            const segment = cutter.cut(window, speechProbability);
            if (segment !== null) {
                utterances.push(await this.transcribeSegment(segment, speakerLabel));
            }
        }

        return utterances;
    }

    private async transcribeSegment(segment: SpeechSegment, speakerLabel: string): Promise<Utterance> {
        const metric = await this.asr.run(segment.samples);

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
