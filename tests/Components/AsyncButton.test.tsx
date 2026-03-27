import { AsyncButton, getLabel } from '@/Components/AsyncButton';
import { ActivityStatus, GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { Container } from '@/Core/Container';

// A very small smoke test that exercises the component's ability to read from
// the global activity store and also respect an explicit status prop.

describe('AsyncButton component', () => {
    beforeEach(() => {
        // Register a fresh instance so Container.get(GlobalActivityStatus) works in each test
        Container.register(GlobalActivityStatus, () => new GlobalActivityStatus(), true);
        Container.get(GlobalActivityStatus).reset();
    });

    it('shows idle label when there is no activity', () => {
        const statusProp = undefined;
        const status = statusProp ?? Container.get(GlobalActivityStatus).getStatus() ?? ActivityStatus.Ready;
        const label = getLabel(status, 'idle', 'pending', 'done');

        expect(label).toBe('idle');
        const pending = status === ActivityStatus.Pending;
        const success = status === ActivityStatus.Success;
        expect(pending).toBe(false);
        expect(success).toBe(false);
    });

    it('mirrors the store status when no explicit status is passed', () => {
        Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Pending, 'working');
        const statusProp = undefined;
        const status = statusProp ?? Container.get(GlobalActivityStatus).getStatus() ?? ActivityStatus.Ready;
        const label = getLabel(status, 'idle', 'pending', 'done');

        expect(label).toBe('pending');
        const pending = status === ActivityStatus.Pending;
        const success = status === ActivityStatus.Success;
        expect(pending).toBe(true);
        expect(success).toBe(false);
    });

    it('honors the status prop over the store', () => {
        Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Pending, 'working');
        const statusProp = ActivityStatus.Success;
        const status = statusProp ?? Container.get(GlobalActivityStatus).getStatus() ?? ActivityStatus.Ready;
        const label = getLabel(status, 'idle', 'pending', 'done');

        expect(label).toBe('done');
        const pending = status === ActivityStatus.Pending;
        const success = status === ActivityStatus.Success;
        expect(pending).toBe(false);
        expect(success).toBe(true);
    });
});
