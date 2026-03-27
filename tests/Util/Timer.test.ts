import { Timer } from '@/Util/Timer';

describe('Timer', () => {
    it('sleep resolves after the given milliseconds', async () => {
        jest.useFakeTimers();

        const promise = Timer.sleep(1234);
        jest.advanceTimersByTime(1233);
        let settled = false;
        promise.then(() => (settled = true));
        // not yet
        expect(settled).toBe(false);

        jest.advanceTimersByTime(1);
        await promise; // now should resolve
        expect(settled).toBe(true);

        jest.useRealTimers();
    });
});
