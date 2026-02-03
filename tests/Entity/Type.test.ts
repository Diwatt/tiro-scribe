import {
    EncounterStatus,
    QueueItemStatus,
    PipelineStage,
    EntityType,
} from '@/Entity/Type';

describe('Entity Type enums', () => {
    describe('EncounterStatus', () => {
        it('has expected values', () => {
            expect(EncounterStatus.RECORDING).toBe('recording');
            expect(EncounterStatus.WAITING).toBe('waiting');
            expect(EncounterStatus.PROCESSING).toBe('processing');
            expect(EncounterStatus.READY).toBe('ready');
            expect(EncounterStatus.ARCHIVED).toBe('archived');
        });
    });

    describe('QueueItemStatus', () => {
        it('has expected values', () => {
            expect(QueueItemStatus.PENDING).toBe('pending');
            expect(QueueItemStatus.RUNNING).toBe('running');
            expect(QueueItemStatus.PAUSED).toBe('paused');
            expect(QueueItemStatus.COMPLETED).toBe('completed');
            expect(QueueItemStatus.FAILED).toBe('failed');
        });
    });

    describe('PipelineStage', () => {
        it('has expected values', () => {
            expect(PipelineStage.WAITING).toBe('waiting');
            expect(PipelineStage.TRANSCRIBING).toBe('transcribing');
            expect(PipelineStage.ANONYMIZING).toBe('anonymizing');
            expect(PipelineStage.TO_SYNC).toBe('to_sync');
        });
    });

    describe('EntityType', () => {
        it('has expected values', () => {
            expect(EntityType.PERSON).toBe('person');
            expect(EntityType.LOCATION).toBe('location');
            expect(EntityType.FAMILY_RELATION).toBe('family_relation');
            expect(EntityType.WORK_RELATION).toBe('work_relation');
            expect(EntityType.DATE).toBe('date');
            expect(EntityType.TIME).toBe('time');
        });
    });
});
