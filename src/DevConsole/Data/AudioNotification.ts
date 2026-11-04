/** Dataclass describing a transient user-facing notification in the dev console. */
export class AudioNotification {
    private constructor(
        public readonly message: string,
        public readonly type: 'success' | 'error',
    ) {}

    public static create(message: string, type: 'success' | 'error'): AudioNotification {
        return new AudioNotification(message, type);
    }
}
