import { SmokeCheck, SmokeCheckStatus } from './SmokeCheck';

/** Dataclass holding the observable snapshot of {@link VadPitchSmoke}. */
export class VadPitchSmokeSnapshot {
    private constructor(
        public readonly isLoading: boolean,
        public readonly checks: SmokeCheck[],
        public readonly error: string | null,
    ) {}

    public static create(
        checks: SmokeCheck[] = [],
        isLoading = false,
        error: string | null = null,
    ): VadPitchSmokeSnapshot {
        return new VadPitchSmokeSnapshot(isLoading, checks, error);
    }

    /** Failed as soon as one check failed, passed only when every check passed. */
    public get verdict(): SmokeCheckStatus {
        if (this.checks.some((check) => check.status === SmokeCheckStatus.Failed)) {
            return SmokeCheckStatus.Failed;
        }
        if (this.checks.length > 0 && this.checks.every((check) => check.status === SmokeCheckStatus.Passed)) {
            return SmokeCheckStatus.Passed;
        }

        return SmokeCheckStatus.Pending;
    }
}
