/** One slice of the storage usage bar. */
export class StorageShare {
    private constructor(
        public readonly label: string,
        public readonly size: string,
        public readonly megabytes: number,
        public readonly color: string,
    ) {}

    public static create(label: string, size: string, megabytes: number, color: string): StorageShare {
        return new StorageShare(label, size, megabytes, color);
    }
}
