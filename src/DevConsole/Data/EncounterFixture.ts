import type { Encounter } from '@/Entity/Encounter';
import type { Patient } from '@/Entity/Patient';
import type { QueueItem } from '@/Entity/QueueItem';

/**
 * EncounterFixture – The outcome of loading an encounter fixture from an
 * encrypted audio file: the persisted Encounter (ToProcess), its Patient
 * (empty biocode, filled by the pipeline) and its QueueItem (Waiting/Pending).
 *
 * DEV ONLY. Not for production use.
 */
export class EncounterFixture {
    public constructor(
        public readonly encounter: Encounter,
        public readonly patient: Patient,
        public readonly queueItem: QueueItem,
    ) {}

    public get summary(): string {
        return `encounter=${this.encounter.getUuid()} patient=${this.patient.getUuid()} queueItem=${this.queueItem.getUuid()}`;
    }
}
