import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container } from '@/Core/Container';
import { ActivityStatus, GlobalActivityStatus } from '@/State/GlobalActivityStatus';


describe('GlobalActivityStatus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Container.globalActivityStatus.reset();
    });


    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('state$ observable should update when set directly', () => {
        const obs = Container.globalActivityStatus.state$;
        obs.set({ status: ActivityStatus.Pending, message: '', icon: undefined });
        expect(obs.get().status).toBe(ActivityStatus.Pending);
        // restore
        obs.set({ status: ActivityStatus.Ready, message: '', icon: undefined });
    });

    it('observable kept as class field should update', () => {
        const { observable } = require('@legendapp/state');
        class Foo { public readonly obs = observable('alpha'); }
        const f = new Foo();
        f.obs.set('beta');
        expect(f.obs.get()).toBe('beta');
    });

    it('new GlobalActivityStatus instance should work independently', () => {
        const inst = new GlobalActivityStatus();
        inst.setStatus(ActivityStatus.Pending, 'x');
        expect(inst.getStatus()).toBe(ActivityStatus.Pending);
    });

    it('auto-hides pending status when autoHideAfterMs is provided', async () => {
        Container.globalActivityStatus.setStatus(ActivityStatus.Pending, 'working', undefined, 1000);
        // allow any microtask/timer used by the observable to complete
        await Promise.resolve();
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Pending);
        vi.advanceTimersByTime(1000);
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Ready);
    });

    it('auto-hides success status when autoHideAfterMs is provided', async () => {
        Container.globalActivityStatus.setStatus(ActivityStatus.Success, 'done', undefined, 2000);
        await Promise.resolve();
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Success);
        vi.advanceTimersByTime(2000);
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Ready);
    });
});
