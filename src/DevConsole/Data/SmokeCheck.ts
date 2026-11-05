export enum SmokeCheckStatus {
    Pending = 'pending',
    Running = 'running',
    Passed = 'passed',
    Failed = 'failed',
}

export enum SmokeCheckId {
    VadVoice = 'vad-voice',
    VadSilence = 'vad-silence',
    PitchTone220 = 'pitch-220',
    PitchTone440 = 'pitch-440',
    PitchTone880 = 'pitch-880',
    PitchSilence = 'pitch-silence',
}

/** One smoke line item: a capability check with its live status and metrics summary. */
export class SmokeCheck {
    private constructor(
        public readonly id: SmokeCheckId,
        public readonly label: string,
        public readonly status: SmokeCheckStatus,
        public readonly summary: string,
        public readonly failureReason: string | null,
    ) {}

    public static create(id: SmokeCheckId, label: string): SmokeCheck {
        return new SmokeCheck(id, label, SmokeCheckStatus.Pending, '', null);
    }

    public withStatus(status: SmokeCheckStatus, summary: string, failureReason: string | null): SmokeCheck {
        return new SmokeCheck(this.id, this.label, status, summary, failureReason);
    }
}
