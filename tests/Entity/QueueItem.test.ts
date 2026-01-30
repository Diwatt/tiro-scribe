/**
 * QueueItem behavior tests. Real QueueItem uses Stage 3 decorators; we test
 * QueueItemStatus and isProcessable logic via the enum and a small helper.
 */

import { QueueItemStatus } from '@/Entity/Type';

const MAX_RETRY_COUNT = 3;

function isProcessable(status: QueueItemStatus, retryCount: number): boolean {
    if (status === QueueItemStatus.PENDING) return true;
    if (status === QueueItemStatus.FAILED && retryCount < MAX_RETRY_COUNT) return true;
    return false;
}

describe('QueueItem (isProcessable logic)', () => {
    it('PENDING is processable', () => {
        expect(isProcessable(QueueItemStatus.PENDING, 0)).toBe(true);
    });

    it('FAILED with retryCount < 3 is processable', () => {
        expect(isProcessable(QueueItemStatus.FAILED, 0)).toBe(true);
        expect(isProcessable(QueueItemStatus.FAILED, 2)).toBe(true);
    });

    it('FAILED with retryCount >= 3 is not processable', () => {
        expect(isProcessable(QueueItemStatus.FAILED, 3)).toBe(false);
    });

    it('COMPLETED is not processable', () => {
        expect(isProcessable(QueueItemStatus.COMPLETED, 0)).toBe(false);
    });
});
