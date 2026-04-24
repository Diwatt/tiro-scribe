import { EncounterStatus, EntityType, PipelineStage, QueueItemStatus } from '@/Entity/Type';

describe('Entity Type enums', () => {
    describe('EncounterStatus', () => {
        it('has expected values', () => {
            expect(EncounterStatus.Recording).toBe('recording');
            expect(EncounterStatus.Paused).toBe('paused');
            expect(EncounterStatus.ToProcess).toBe('to_process');
            expect(EncounterStatus.ProcessingLocal).toBe('processing_local');
            expect(EncounterStatus.ProcessingRemote).toBe('processing_remote');
            expect(EncounterStatus.Completed).toBe('completed');
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
