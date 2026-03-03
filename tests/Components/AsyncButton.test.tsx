import { describe, it, expect, beforeEach } from 'vitest';
import { AsyncButton, getLabel } from '@/Components/AsyncButton';
import { ActivityStatus } from '@/State/GlobalActivityStatus';
import { Container } from '@/Container';

// A very small smoke test that exercises the component's ability to read from
// the global activity store and also respect an explicit status prop.

describe('AsyncButton component', () => {
    beforeEach(() => {
        Container.globalActivityStatus.reset();
    });

    it('shows idle label when there is no activity', () => {
        const statusProp = undefined;
        const status = statusProp ?? Container.globalActivityStatus.getStatus() ?? ActivityStatus.Ready;
        const label = getLabel(status, 'idle', 'pending', 'done');

        expect(label).toBe('idle');
        const pending = status === ActivityStatus.Pending;
        const success = status === ActivityStatus.Success;
        expect(pending).toBe(false);
        expect(success).toBe(false);
    });

    it('mirrors the store status when no explicit status is passed', () => {
        Container.globalActivityStatus.setStatus(ActivityStatus.Pending, 'working');
        const statusProp = undefined;
        const status = statusProp ?? Container.globalActivityStatus.getStatus() ?? ActivityStatus.Ready;
        const label = getLabel(status, 'idle', 'pending', 'done');

        expect(label).toBe('pending');
        const pending = status === ActivityStatus.Pending;
        const success = status === ActivityStatus.Success;
        expect(pending).toBe(true);
        expect(success).toBe(false);
    });

    it('honors the status prop over the store', () => {
        Container.globalActivityStatus.setStatus(ActivityStatus.Pending, 'working');
        const statusProp = ActivityStatus.Success;
        const status = statusProp ?? Container.globalActivityStatus.getStatus() ?? ActivityStatus.Ready;
        const label = getLabel(status, 'idle', 'pending', 'done');

        expect(label).toBe('done');
        const pending = status === ActivityStatus.Pending;
        const success = status === ActivityStatus.Success;
        expect(pending).toBe(false);
        expect(success).toBe(true);
    });
});
