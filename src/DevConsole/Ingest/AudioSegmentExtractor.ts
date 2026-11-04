import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import type { AudioSegment } from '../Data/AudioSegment';
import { AudioFileReader } from './AudioFileReader';
import { PcmDecoder } from './PcmDecoder';
import { SourceIngestException } from './SourceIngestException';

/**
 * AudioSegmentExtractor – Extracts a time-based segment of an audio file as
 * normalized Float32Array PCM.
 * Single responsibility: the ms -> sample window over decoded PCM. Reading
 * and decoding are delegated to AudioFileReader and PcmDecoder.
 *
 * DEV ONLY. Not for production use.
 */
export class AudioSegmentExtractor {
    public static readonly SAMPLES_PER_MS = PcmDecoder.TARGET_SAMPLE_RATE / 1000;

    public constructor(
        private readonly logger: AppLogger,
        private readonly fileReader: AudioFileReader,
        private readonly decoder: PcmDecoder,
    ) {}

    public async extract(audioPath: string, segment: AudioSegment): Promise<Float32Array> {
        const fullPcm = await this.readFullPcm(audioPath);

        const startSample = Math.floor(segment.startMs * AudioSegmentExtractor.SAMPLES_PER_MS);
        const endSample = Math.floor(segment.endMs * AudioSegmentExtractor.SAMPLES_PER_MS);
        const segmentLength = endSample - startSample;

        if (fullPcm.length < startSample) {
            throw new SourceIngestException(
                `Segment starts at sample ${startSample} but audio only has ${fullPcm.length} samples`,
                'SEGMENT_OUT_OF_BOUNDS',
            );
        }

        const actualEnd = Math.min(endSample, fullPcm.length);
        const actualLength = actualEnd - startSample;

        if (actualLength < segmentLength * 0.5) {
            this.logger.warn('AudioSegmentExtractor: segment shorter than requested', {
                requestedLength: segmentLength,
                actualLength,
                totalSamples: fullPcm.length,
            });
        }

        return fullPcm.subarray(startSample, actualEnd);
    }

    public async readFullPcm(audioPath: string): Promise<Float32Array> {
        return this.decoder.decode(await this.fileReader.readBytes(audioPath), audioPath);
    }
}

Container.register(
    AudioSegmentExtractor,
    () =>
        new AudioSegmentExtractor(Container.get(AppLogger), Container.get(AudioFileReader), Container.get(PcmDecoder)),
);
