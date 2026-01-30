import {
    EncounterStatus,
    QueueItemStatus,
    PipelineStage,
    EntityType,
} from '@/Entity/Type';

describe('Entity Type enums', () => {
    describe('EncounterStatus', () => {
        it('has expected values', () => {
            expect(EncounterStatus.RECORDING).toBe('RECORDING');
            expect(EncounterStatus.WAITING).toBe('WAITING');
            expect(EncounterStatus.PROCESSING).toBe('PROCESSING');
            expect(EncounterStatus.READY).toBe('READY');
            expect(EncounterStatus.ARCHIVED).toBe('ARCHIVED');
        });
    });

    describe('QueueItemStatus', () => {
        it('has expected values', () => {
            expect(QueueItemStatus.PENDING).toBe('PENDING');
            expect(QueueItemStatus.RUNNING).toBe('RUNNING');
            expect(QueueItemStatus.PAUSED).toBe('PAUSED');
            expect(QueueItemStatus.COMPLETED).toBe('COMPLETED');
            expect(QueueItemStatus.FAILED).toBe('FAILED');
        });
    });

    describe('PipelineStage', () => {
        it('has expected values', () => {
            expect(PipelineStage.WAITING).toBe('WAITING');
            expect(PipelineStage.TRANSCRIBING).toBe('TRANSCRIBING');
            expect(PipelineStage.ANONYMIZING).toBe('ANONYMIZING');
            expect(PipelineStage.TO_SYNC).toBe('TO_SYNC');
        });
    });

    describe('EntityType', () => {
        it('has expected values', () => {
            expect(EntityType.PERSON).toBe('PERSON');
            expect(EntityType.LOCATION).toBe('LOCATION');
            expect(EntityType.FAMILY_RELATION).toBe('FAMILY_RELATION');
            expect(EntityType.WORK_RELATION).toBe('WORK_RELATION');
            expect(EntityType.DATE).toBe('DATE');
            expect(EntityType.TIME).toBe('TIME');
        });
    });
});
