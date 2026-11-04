/** Dataclass describing one raw audio file discovered in a source directory. */
export class AudioFileEntry {
    private constructor(
        public readonly name: string,
        public readonly path: string,
        public readonly sizeBytes: number,
        public readonly encryptedPath: string | null,
        public readonly isEncrypted: boolean,
        public readonly durationMs: number | null,
    ) {}

    public static create(
        name: string,
        path: string,
        sizeBytes: number,
        encryptedPath: string | null,
        isEncrypted: boolean,
        durationMs: number | null,
    ): AudioFileEntry {
        return new AudioFileEntry(name, path, sizeBytes, encryptedPath, isEncrypted, durationMs);
    }
}
