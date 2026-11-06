/** One recent session as listed on the sessions home. */
export class SessionPreview {
    private constructor(
        public readonly id: string,
        public readonly subjectName: string,
        public readonly when: string,
        public readonly excerpt: string,
    ) {}

    public static create(id: string, subjectName: string, when: string, excerpt: string): SessionPreview {
        return new SessionPreview(id, subjectName, when, excerpt);
    }

    public getInitial(): string {
        return this.subjectName.trim().split(' ').pop()?.charAt(0).toUpperCase() ?? '';
    }
}
