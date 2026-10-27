/**
 * Fake entities for the DevConsole fixture tests. The real entities rely on Stage 3
 * decorator metadata that the Jest runner cannot load (same reason the
 * tests/Entity suites use mockEntity) — these mimics expose only the surface
 * used by src/DevConsole/FixtureLoader.
 */

import { EncounterStatus, PipelineStage, QueueItemStatus } from '@/Entity/Type';

export class FakeEncounter {
    private static sequence = 0;

    public readonly uuid: string;
    public readonly therapistId: string;
    public readonly isIncognito: boolean;

    private readonly encryptedAudioPaths: string[] = [];
    private status: EncounterStatus = EncounterStatus.Recording;
    private totalDuration = 0;

    public constructor(therapistId: string, isIncognito: boolean) {
        FakeEncounter.sequence += 1;
        this.uuid = `encounter-uuid-${FakeEncounter.sequence}`;
        this.therapistId = therapistId;
        this.isIncognito = isIncognito;
    }

    public static create(therapistId: string, isIncognito = false): FakeEncounter {
        return new FakeEncounter(therapistId, isIncognito);
    }

    public addEncryptedAudioPathWithDuration(path: string, durationMs: number): void {
        this.encryptedAudioPaths.push(path);
        this.totalDuration += durationMs;
    }

    public setStatus(value: EncounterStatus): void {
        this.status = value;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public getTherapistId(): string {
        return this.therapistId;
    }

    public getEncryptedAudioPaths(): string[] {
        return [...this.encryptedAudioPaths];
    }

    public getTotalDuration(): number {
        return this.totalDuration;
    }

    public getStatus(): EncounterStatus {
        return this.status;
    }
}

export class FakePatient {
    private static sequence = 0;

    public readonly uuid: string;

    public constructor(private readonly input: { encounterId: string }) {
        FakePatient.sequence += 1;
        this.uuid = `patient-uuid-${FakePatient.sequence}`;
    }

    public getEncounterId(): string {
        return this.input.encounterId;
    }

    public getBiocode(): string {
        return '';
    }

    public getUuid(): string {
        return this.uuid;
    }
}

export class FakeQueueItem {
    private static sequence = 0;

    public readonly uuid: string;

    public constructor(
        private readonly encounterId: string,
        private readonly encryptedAudioPath: string,
        private readonly pipelineStage: PipelineStage = PipelineStage.Waiting,
        private readonly status: QueueItemStatus = QueueItemStatus.Pending,
    ) {
        FakeQueueItem.sequence += 1;
        this.uuid = `queue-item-uuid-${FakeQueueItem.sequence}`;
    }

    public static createForEncounter(encounterId: string, encryptedAudioPath: string): FakeQueueItem {
        return new FakeQueueItem(encounterId, encryptedAudioPath);
    }

    public getEncounterId(): string {
        return this.encounterId;
    }

    public getEncryptedAudioPath(): string {
        return this.encryptedAudioPath;
    }

    public getPipelineStage(): PipelineStage {
        return this.pipelineStage;
    }

    public getStatus(): QueueItemStatus {
        return this.status;
    }

    public getUuid(): string {
        return this.uuid;
    }
}
