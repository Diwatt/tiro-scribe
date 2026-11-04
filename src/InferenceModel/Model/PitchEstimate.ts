/**
 * PitchEstimate – Pitch frequency and voicing confidence for one analysis frame.
 * hz is 0 when the frame is unvoiced (confidence below the configured threshold).
 */
export class PitchEstimate {
    public constructor(
        public readonly hz: number,
        public readonly confidence: number,
    ) {}
}
