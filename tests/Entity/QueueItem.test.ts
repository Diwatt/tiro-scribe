/**
 * QueueItem entity behavior tests against the real decorated class.
 * isProcessable branches follow "1 if = 1 test".
 *
 * Retry policy: the entity reads its own `maxRetries` column (default 3,
 * overridable per item via setMaxRetries).
 */

import { QueueItem } from '@/Entity/QueueItem';
import { PipelineStage, QueueItemStatus } from '@/Entity/Type';

jest.mock('@/Core/AppLogger', () => {
    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return {
        AppLogger: {
            getInstance: jest.fn(() => mockLogger),
            ...mockLogger,
        },
    };
});

/** Default of the QueueItem.maxRetries column (@Column({ default: 3 })). */
const DEFAULT_MAX_RETRIES = 3;

describe('QueueItem', () => {
    describe('constructor defaults', () => {
        it('creates a pending item waiting in the pipeline for its encounter', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });

            expect(item.getEncounterId()).toBe('encounter-1');
            expect(item.getStatus()).toBe(QueueItemStatus.Pending);
            expect(item.getPipelineStage()).toBe(PipelineStage.Waiting);
            expect(item.getRetryCount()).toBe(0);
            expect(item.getMaxRetries()).toBe(DEFAULT_MAX_RETRIES);
        });
    });

    describe('createForEncounter', () => {
        it('binds the encounter id and the encrypted audio path', () => {
            const item = QueueItem.createForEncounter('encounter-1', '/audio/chunk-1.dat');

            expect(item.getEncounterId()).toBe('encounter-1');
            expect(item.getEncryptedAudioPath()).toBe('/audio/chunk-1.dat');
        });
    });

    describe('isProcessable', () => {
        it('returns true while the item is pending', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });

            expect(item.isProcessable).toBe(true);
        });

        it('returns true for a failed item below the retry limit', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });
            item.setStatus(QueueItemStatus.Failed);
            item.setRetryCount(DEFAULT_MAX_RETRIES - 1);

            expect(item.isProcessable).toBe(true);
        });

        it('returns false for a failed item that reached the retry limit', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });
            item.setStatus(QueueItemStatus.Failed);
            item.setRetryCount(DEFAULT_MAX_RETRIES);

            expect(item.isProcessable).toBe(false);
        });

        it('returns false for a running item', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });
            item.setStatus(QueueItemStatus.Running);

            expect(item.isProcessable).toBe(false);
        });

        it('returns false for a completed item', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });
            item.setStatus(QueueItemStatus.Completed);

            expect(item.isProcessable).toBe(false);
        });

        it('returns false for a paused item', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });
            item.setStatus(QueueItemStatus.Paused);

            expect(item.isProcessable).toBe(false);
        });

        it('honours the item maxRetries policy above the default limit', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });
            item.setStatus(QueueItemStatus.Failed);
            item.setRetryCount(3);
            item.setMaxRetries(5);

            expect(item.isProcessable).toBe(true);
        });

        it('stops retrying earlier when the item maxRetries is lower than the default', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });
            item.setStatus(QueueItemStatus.Failed);
            item.setRetryCount(2);
            item.setMaxRetries(1);

            expect(item.isProcessable).toBe(false);
        });
    });

    describe('setPipelineStage', () => {
        it('stores the stage returned by getPipelineStage', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });

            item.setPipelineStage(PipelineStage.Transcribing);

            expect(item.getPipelineStage()).toBe(PipelineStage.Transcribing);
        });
    });

    describe('setErrorMessage', () => {
        it('stores the message returned by getErrorMessage', () => {
            const item = new QueueItem({ encounterId: 'encounter-1' });

            item.setErrorMessage('transcription failed');

            expect(item.getErrorMessage()).toBe('transcription failed');
        });
    });
});
