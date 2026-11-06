import { Utterance } from '@/Entity';
import { PipelineTimings } from '@/Pipeline';

/** Dataclass holding the observable snapshot of {@link SessionTranscribe}. */
export class SessionTranscribeSnapshot {
    private constructor(
        public readonly isLoading: boolean,
        public readonly utterances: Utterance[],
        public readonly elapsedMs: number | null,
        public readonly error: string | null,
        public readonly timings: PipelineTimings | null,
    ) {}

    public static create(
        utterances: Utterance[] = [],
        isLoading = false,
        elapsedMs: number | null = null,
        error: string | null = null,
        timings: PipelineTimings | null = null,
    ): SessionTranscribeSnapshot {
        return new SessionTranscribeSnapshot(isLoading, utterances, elapsedMs, error, timings);
    }
}
