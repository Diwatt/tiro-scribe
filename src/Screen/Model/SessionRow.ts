/** A past session in a subject sheet. */
export class SessionRow {
    private constructor(
        public readonly id: string,
        public readonly date: string,
        public readonly meta: string,
        public readonly excerpt: string,
        public readonly hasNote: boolean,
    ) {}

    public static create(id: string, date: string, meta: string, excerpt: string, hasNote = false): SessionRow {
        return new SessionRow(id, date, meta, excerpt, hasNote);
    }
}
