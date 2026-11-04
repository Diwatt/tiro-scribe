import type { File } from 'expo-file-system';

/**
 * ModelArtifact – A bundle file resolved by role, read lazily from disk: the
 * URI is stable, the text is only read when the file exists.
 */
export class ModelArtifact {
    public constructor(
        private readonly file: File,
        private readonly uri: string,
    ) {}

    public isDownloaded(): boolean {
        return this.file.exists;
    }

    public getUri(): string {
        return this.uri;
    }

    public getText(): Promise<string | null> {
        return this.file.exists ? this.file.text() : Promise.resolve(null);
    }
}
