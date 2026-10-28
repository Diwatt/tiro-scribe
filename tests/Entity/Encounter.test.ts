/**
 * Encounter entity behavior tests against the real decorated class
 * (same pattern as Therapist.test.ts — the entity loads fine under the
 * jest-expo babel transform; the old mock-based test locked a divergent schema).
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Encounter } from '@/Entity/Encounter';
import { EncounterStatus } from '@/Entity/Type';

dayjs.extend(utc);

jest.mock('@/Core/AppLogger', () => {
    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return {
        AppLogger: mockLogger,
    };
});

describe('Encounter', () => {
    describe('constructor defaults', () => {
        it('applies recording defaults to a new encounter', () => {
            const encounter = new Encounter({ therapistId: 'therapist-1' });

            expect(encounter.getUuid()).toBeDefined();
            expect(encounter.getTherapistId()).toBe('therapist-1');
            expect(encounter.getStatus()).toBe(EncounterStatus.Recording);
            expect(encounter.getEncryptedAudioPaths()).toEqual([]);
            expect(encounter.getIsIncognito()).toBe(false);
            expect(encounter.getTotalDuration()).toBe(0);
        });
    });

    describe('create', () => {
        it('creates a standard encounter bound to the therapist', () => {
            const encounter = Encounter.create('therapist-1');

            expect(encounter.getTherapistId()).toBe('therapist-1');
            expect(encounter.getIsIncognito()).toBe(false);
        });

        it('creates an incognito encounter when requested', () => {
            const encounter = Encounter.create('therapist-1', true);

            expect(encounter.getIsIncognito()).toBe(true);
        });
    });

    describe('getSessionId', () => {
        it('prefixes the uuid with the encounter session prefix', () => {
            const encounter = new Encounter({ therapistId: 'therapist-1', uuid: 'uuid-1' });

            expect(encounter.getSessionId()).toBe('encounter-uuid-1');
        });
    });

    describe('addEncryptedAudioPath', () => {
        it('appends chunk paths in order to the encrypted audio list', () => {
            const encounter = new Encounter({ therapistId: 'therapist-1' });

            encounter.addEncryptedAudioPath('/audio/chunk-1.dat');
            encounter.addEncryptedAudioPath('/audio/chunk-2.dat');

            expect(encounter.getEncryptedAudioPaths()).toEqual(['/audio/chunk-1.dat', '/audio/chunk-2.dat']);
        });
    });

    describe('addEncryptedAudioPathWithDuration', () => {
        it('appends the chunk path like addEncryptedAudioPath', () => {
            const encounter = new Encounter({ therapistId: 'therapist-1' });

            encounter.addEncryptedAudioPathWithDuration('/audio/chunk-1.dat', 1500);

            expect(encounter.getEncryptedAudioPaths()).toEqual(['/audio/chunk-1.dat']);
        });

        it('accumulates chunk durations into the total duration', () => {
            const encounter = new Encounter({ therapistId: 'therapist-1' });

            encounter.addEncryptedAudioPathWithDuration('/audio/chunk-1.dat', 1500);
            encounter.addEncryptedAudioPathWithDuration('/audio/chunk-2.dat', 500);

            expect(encounter.getTotalDuration()).toBe(2000);
        });
    });

    describe('removeEncryptedAudioPath', () => {
        it('removes only the matching path and keeps the others', () => {
            const encounter = new Encounter({ therapistId: 'therapist-1' });
            encounter.addEncryptedAudioPath('/audio/chunk-1.dat');
            encounter.addEncryptedAudioPath('/audio/chunk-2.dat');

            encounter.removeEncryptedAudioPath('/audio/chunk-1.dat');

            expect(encounter.getEncryptedAudioPaths()).toEqual(['/audio/chunk-2.dat']);
        });
    });

    describe('setStatus', () => {
        it('stores the status returned by getStatus', () => {
            const encounter = new Encounter({ therapistId: 'therapist-1' });

            encounter.setStatus(EncounterStatus.Completed);

            expect(encounter.getStatus()).toBe(EncounterStatus.Completed);
        });
    });

    describe('setSyncedAt', () => {
        it('stores the sync date returned by getSyncedAt', () => {
            const encounter = new Encounter({ therapistId: 'therapist-1' });
            const syncedAt = dayjs.utc('2026-01-15T10:00:00.000Z');

            encounter.setSyncedAt(syncedAt);

            const storedSyncedAt = encounter.getSyncedAt();
            expect(storedSyncedAt?.toISOString()).toBe('2026-01-15T10:00:00.000Z');
        });
    });
});
