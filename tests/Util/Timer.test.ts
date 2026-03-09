import { describe, it, expect, vi } from 'vitest';
import { Timer } from '@/Util/Timer';

describe('Timer', () => {
    it('sleep resolves after the given milliseconds', async () => {
        vi.useFakeTimers();

        const promise = Timer.sleep(1234);
        vi.advanceTimersByTime(1233);
        let settled = false;
        promise.then(() => (settled = true));
        // not yet
        expect(settled).toBe(false);

        vi.advanceTimersByTime(1);
        await promise; // now should resolve
        expect(settled).toBe(true);

        vi.useRealTimers();
    });
});
