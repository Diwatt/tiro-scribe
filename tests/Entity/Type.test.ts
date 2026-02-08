import { EncounterStatus, EntityType, PipelineStage, QueueItemStatus } from '@/Entity/Type';

describe('Entity Type enums', () => {
    describe('EncounterStatus', () => {
        it('has expected values', () => {
            expect(EncounterStatus.Recording).toBe('recording');
            expect(EncounterStatus.Waiting).toBe('waiting');
            expect(EncounterStatus.Processing).toBe('processing');
            expect(EncounterStatus.Ready).toBe('ready');
            expect(EncounterStatus.Archived).toBe('archived');
        });
    });

    describe('QueueItemStatus', () => {
        it('has expected values', () => {
            expect(QueueItemStatus.Pending).toBe('pending');
            expect(QueueItemStatus.Running).toBe('running');
            expect(QueueItemStatus.Paused).toBe('paused');
            expect(QueueItemStatus.Completed).toBe('completed');
            expect(QueueItemStatus.Failed).toBe('failed');
        });
    });

    describe('PipelineStage', () => {
        it('has expected values', () => {
            expect(PipelineStage.Waiting).toBe('waiting');
            expect(PipelineStage.Transcribing).toBe('transcribing');
            expect(PipelineStage.Anonymizing).toBe('anonymizing');
            expect(PipelineStage.ToSync).toBe('to_sync');
        });
    });

    describe('EntityType', () => {
        it('has expected values', () => {
            expect(EntityType.Person).toBe('person');
            expect(EntityType.Location).toBe('location');
            expect(EntityType.FamilyRelation).toBe('family_relation');
            expect(EntityType.WorkRelation).toBe('work_relation');
            expect(EntityType.Date).toBe('date');
            expect(EntityType.Time).toBe('time');
        });
    });
});
