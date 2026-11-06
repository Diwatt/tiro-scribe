import { SubjectStatus } from './SubjectStatus';

/** A subject row: pseudonym, last session, session metadata and pending status. */
export class SubjectSummary {
    private constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly lastSeen: string,
        public readonly meta: string,
        public readonly status: SubjectStatus,
        public readonly statusLabel: string,
    ) {}

    public static create(
        id: string,
        name: string,
        lastSeen: string,
        meta: string,
        status: SubjectStatus = SubjectStatus.None,
        statusLabel = '',
    ): SubjectSummary {
        return new SubjectSummary(id, name, lastSeen, meta, status, statusLabel);
    }

    public getInitial(): string {
        return this.name.trim().split(' ').pop()?.charAt(0).toUpperCase() ?? '';
    }

    public hasStatus(): boolean {
        return this.status !== SubjectStatus.None;
    }
}
