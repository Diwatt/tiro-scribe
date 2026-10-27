import { getStatusColors } from '@/theme/AppTheme';
import { Container } from '@/Core/Container';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { ActivityStatus } from '@/State/GlobalActivityStatus';
import { GlobalActivityStatus } from '@/State/GlobalActivityStatus';

// minimal fake theme containing the required color sections
const fakeTheme = {
    colors: {
        statusProcessing: { background: '', text: '', accent: '', iconBackground: '', shadowColor: '' },
        statusIdle: { background: '', text: '', accent: '', iconBackground: '', shadowColor: '' },
        statusWarning: { background: '', text: '', accent: '', iconBackground: '', shadowColor: '' },
        statusError: { background: '', text: '', accent: '', iconBackground: '', shadowColor: '' },
    },
} as unknown as ExtendedTheme;

describe('GlobalActivityBar helpers', () => {
    it.each([
        [ActivityStatus.Pending, 'statusProcessing'],
        [ActivityStatus.Success, 'statusIdle'],
        [ActivityStatus.Warning, 'statusWarning'],
        [ActivityStatus.Error, 'statusError'],
    ])('returns the shared %s color section for %s', (status, colorsKey) => {
        const expected = (fakeTheme.colors as Record<string, unknown>)[colorsKey];
        expect(getStatusColors(fakeTheme, status)).toBe(expected);
    });

    it('returns null for the Ready status', () => {
        expect(getStatusColors(fakeTheme, ActivityStatus.Ready)).toBeNull();
    });
});

// additional component behaviour tests

describe('GlobalActivityBar component', () => {
    // Declare `globalActivityStatus` at the top level for shared access
    let globalActivityStatus: GlobalActivityStatus;

    beforeEach(() => {
        // Register a fresh instance so Container.get(GlobalActivityStatus) works in each test
        Container.register(GlobalActivityStatus, () => new GlobalActivityStatus(), true);
        globalActivityStatus = Container.get(GlobalActivityStatus) as GlobalActivityStatus;
    });

    it('renders hidden bar when store has no active status', () => {
        const { status, message, icon } = globalActivityStatus.readFromStore();
        expect(status).toBe(ActivityStatus.Ready);
        expect(message).toBe('');
        expect(icon).toBeUndefined();
    });

    it('renders message from store when status present', () => {
        globalActivityStatus.setStatus(ActivityStatus.Pending, 'Downloading');
        const { status, message } = globalActivityStatus.readFromStore();
        expect(status).toBe(ActivityStatus.Pending);
        expect(message).toBe('Downloading');
    });

    it('renders custom icon from store when provided', () => {
        globalActivityStatus.setStatus(ActivityStatus.Pending, 'Downloading', '⭐');
        const { icon } = globalActivityStatus.readFromStore();
        expect(icon).toBe('⭐');
    });
});
