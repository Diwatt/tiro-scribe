/**
 * SourceFile – Represents a source file in the DevConsole context.
 *
 * DEV ONLY. Not for production use.
 */
export class SourceFile {
    public constructor(
        public readonly path: string,
        public readonly sizeBytes: number,
    ) {}
}
