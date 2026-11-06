/** Download progress of an on-device model during onboarding. */
export class ModelDownload {
    private constructor(
        public readonly name: string,
        public readonly detail: string,
        public readonly progress: number,
    ) {}

    public static create(name: string, detail: string, progress: number): ModelDownload {
        return new ModelDownload(name, detail, Math.min(1, Math.max(0, progress)));
    }

    public isComplete(): boolean {
        return this.progress >= 1;
    }
}
