import { Utterance } from '@/Entity';
import { PipelineTimings } from './PipelineTimings';

/**
 * StreamTranscription - utterances of one StreamTranscriber run plus the
 * cumulative phase timings of the pull pipeline that produced them.
 */
export class StreamTranscription {
    private constructor(
        public readonly utterances: Utterance[],
        public readonly timings: PipelineTimings,
    ) {}

    public static create(utterances: Utterance[], timings: PipelineTimings): StreamTranscription {
        return new StreamTranscription(utterances, timings);
    }
}
