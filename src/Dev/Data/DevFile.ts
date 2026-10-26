/**
 * DevFile – Represents a file in the dev tooling context.
 *
 * DEV ONLY. Not for production use.
 */
export class DevFile {
    public constructor(
        public readonly path: string,
        public readonly sizeBytes: number,
    ) {}
}
