import { SpectrogramParityResult } from './SpectrogramParityResult';

/** Dataclass holding the observable snapshot of {@link SpectrogramParity}. */
export class SpectrogramParitySnapshot {
    private constructor(
        public readonly isLoading: boolean,
        public readonly result: SpectrogramParityResult | null,
        public readonly error: string | null,
    ) {}

    public static create(
        result: SpectrogramParityResult | null = null,
        isLoading = false,
        error: string | null = null,
    ): SpectrogramParitySnapshot {
        return new SpectrogramParitySnapshot(isLoading, result, error);
    }
}
