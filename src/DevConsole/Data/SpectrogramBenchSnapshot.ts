import { SpectrogramBenchEntry } from './SpectrogramBenchEntry';

/** Dataclass holding the observable snapshot of {@link SpectrogramBench}. */
export class SpectrogramBenchSnapshot {
    private constructor(
        public readonly isLoading: boolean,
        public readonly entries: SpectrogramBenchEntry[],
        public readonly error: string | null,
    ) {}

    public static create(
        entries: SpectrogramBenchEntry[] = [],
        isLoading = false,
        error: string | null = null,
    ): SpectrogramBenchSnapshot {
        return new SpectrogramBenchSnapshot(isLoading, entries, error);
    }
}
