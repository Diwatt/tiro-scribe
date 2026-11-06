/** A session waiting in the transcription queue; interrupted ones carry their progress. */
export class QueuedSession {
    private constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly detail: string,
        public readonly interruptedPercent: number | null,
    ) {}

    public static create(id: string, label: string, detail: string, interruptedPercent: number | null = null): QueuedSession {
        return new QueuedSession(id, label, detail, interruptedPercent);
    }

    public isInterrupted(): boolean {
        return this.interruptedPercent !== null;
    }
}
