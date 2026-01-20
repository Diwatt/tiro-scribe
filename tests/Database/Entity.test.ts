/**
 * Entity Tests
 * Tests for entity classes (fromDatabase, toDatabase, business logic)
 */

import {QueueItem} from '@Entity/QueueItem';
import {QueueItemStatus, PipelineStage} from '@Entity/Type';
import {Therapist} from '@Entity/Therapist';
import {Subject} from '@Entity/Subject';
import {Encounter, EncounterStatus} from '@Entity/Encounter';
import {TranscriptionSegment} from '@Entity/TranscriptionSegment';
import type {QueueItemSchema} from '@Entity/QueueItem';
import type {TherapistSchema} from '@Entity/Therapist';
import type {SubjectSchema} from '@Entity/Subject';
import type {EncounterSchema} from '@Entity/Encounter';
import type {TranscriptionSegmentSchema} from '@Entity/TranscriptionSegment';

describe('Entity Classes', () => {
    describe('QueueItem', () => {
        const mockData: QueueItemSchema = {
            id: 'test-id',
            encounterUuid: 'encounter-uuid',
            filePath: '/path/to/file.wav',
            status: QueueItemStatus.PENDING,
            pipelineStage: PipelineStage.TRANSCRIPTION,
            progressPercent: 0,
            autoProcess: true,
            retryCount: 0,
            errorLog: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        it('should create entity from database record', () => {
            const entity = QueueItem.fromDatabase(mockData);
            expect(entity).toBeInstanceOf(QueueItem);
            expect(entity.id).toBe(mockData.id);
            expect(entity.status).toBe(QueueItemStatus.PENDING);
        });

        it('should convert entity to database format', () => {
            const entity = QueueItem.fromDatabase(mockData);
            const dbData = entity.toDatabase();
            expect(dbData).toEqual(mockData);
        });

        it('should check if item is processable (PENDING)', () => {
            const entity = QueueItem.fromDatabase(mockData);
            expect(entity.isProcessable).toBe(true);
        });

        it('should check if item is processable (FAILED with retries)', () => {
            const failedData: QueueItemSchema = {
                ...mockData,
                status: QueueItemStatus.FAILED,
                retryCount: 2,
            };
            const entity = QueueItem.fromDatabase(failedData);
            expect(entity.isProcessable).toBe(true);
        });

        it('should check if item is not processable (FAILED with max retries)', () => {
            const failedData: QueueItemSchema = {
                ...mockData,
                status: QueueItemStatus.FAILED,
                retryCount: 3,
            };
            const entity = QueueItem.fromDatabase(failedData);
            expect(entity.isProcessable).toBe(false);
        });
    });

    describe('Therapist', () => {
        const mockData: TherapistSchema = {
            id: 'therapist-id',
            uuid: 'therapist-uuid',
            passwordHash: 'hashed-password',
            name: 'Dr. Smith',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        it('should create entity from database record', () => {
            const entity = Therapist.fromDatabase(mockData);
            expect(entity).toBeInstanceOf(Therapist);
            expect(entity.id).toBe(mockData.id);
            expect(entity.name).toBe(mockData.name);
        });

        it('should convert entity to database format', () => {
            const entity = Therapist.fromDatabase(mockData);
            const dbData = entity.toDatabase();
            expect(dbData).toEqual(mockData);
        });

        it('should generate projection key from password', () => {
            const entity = Therapist.fromDatabase(mockData);
            const key1 = entity.getProjectionKey('password123');
            const key2 = entity.getProjectionKey('password123');
            const key3 = entity.getProjectionKey('different-password');
            
            // Same password should generate same key
            expect(key1).toBe(key2);
            // Different password should generate different key
            expect(key1).not.toBe(key3);
        });
    });

    describe('Subject', () => {
        const mockData: SubjectSchema = {
            id: 'subject-id',
            uuid: 'subject-uuid',
            biocode: 'biocode-123',
            therapistId: 'therapist-id',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        it('should create entity from database record', () => {
            const entity = Subject.fromDatabase(mockData);
            expect(entity).toBeInstanceOf(Subject);
            expect(entity.biocode).toBe(mockData.biocode);
        });

        it('should convert entity to database format', () => {
            const entity = Subject.fromDatabase(mockData);
            const dbData = entity.toDatabase();
            expect(dbData).toEqual(mockData);
        });
    });

    describe('Encounter', () => {
        const mockData: EncounterSchema = {
            id: 'encounter-id',
            uuid: 'encounter-uuid',
            subjectId: 'subject-id',
            therapistId: 'therapist-id',
            status: EncounterStatus.IN_PROGRESS,
            startDate: Date.now(),
            endDate: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        it('should create entity from database record', () => {
            const entity = Encounter.fromDatabase(mockData);
            expect(entity).toBeInstanceOf(Encounter);
            expect(entity.status).toBe(EncounterStatus.IN_PROGRESS);
            expect(entity.startDate).toBeInstanceOf(Date);
        });

        it('should convert entity to database format', () => {
            const entity = Encounter.fromDatabase(mockData);
            const dbData = entity.toDatabase();
            expect(dbData).toEqual(mockData);
        });

        it('should check if encounter is active', () => {
            const entity = Encounter.fromDatabase(mockData);
            expect(entity.isActive).toBe(true);
        });

        it('should check if encounter is completed', () => {
            const completedData: EncounterSchema = {
                ...mockData,
                status: EncounterStatus.COMPLETED,
            };
            const entity = Encounter.fromDatabase(completedData);
            expect(entity.isCompleted).toBe(true);
        });

        it('should calculate duration when ended', () => {
            const startTime = Date.now();
            const endTime = startTime + 3600000; // 1 hour later
            const endedData: EncounterSchema = {
                ...mockData,
                startDate: startTime,
                endDate: endTime,
                status: EncounterStatus.COMPLETED,
            };
            const entity = Encounter.fromDatabase(endedData);
            expect(entity.duration).toBe(3600000);
        });

        it('should return null duration when not ended', () => {
            const entity = Encounter.fromDatabase(mockData);
            expect(entity.duration).toBeNull();
        });
    });

    describe('TranscriptionSegment', () => {
        const mockData: TranscriptionSegmentSchema = {
            id: 'segment-id',
            uuid: 'segment-uuid',
            encounterId: 'encounter-id',
            text: 'Hello world',
            startTime: 0,
            endTime: 5000,
            confidence: 85,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        it('should create entity from database record', () => {
            const entity = TranscriptionSegment.fromDatabase(mockData);
            expect(entity).toBeInstanceOf(TranscriptionSegment);
            expect(entity.text).toBe(mockData.text);
        });

        it('should convert entity to database format', () => {
            const entity = TranscriptionSegment.fromDatabase(mockData);
            const dbData = entity.toDatabase();
            expect(dbData).toEqual(mockData);
        });

        it('should calculate duration', () => {
            const entity = TranscriptionSegment.fromDatabase(mockData);
            expect(entity.duration).toBe(5000);
        });

        it('should check high confidence', () => {
            const entity = TranscriptionSegment.fromDatabase(mockData);
            expect(entity.hasHighConfidence).toBe(true);
        });

        it('should format time correctly', () => {
            const entity = TranscriptionSegment.fromDatabase(mockData);
            expect(entity.formattedStartTime).toBe('00:00:00');
            expect(entity.formattedEndTime).toBe('00:00:05');
        });
    });
});
