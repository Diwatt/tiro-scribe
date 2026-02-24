import { describe, it, expect, beforeEach } from 'vitest';
import { getStatusColors, readFromStore } from '@/Components/GlobalActivityBar';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { ActivityStatus, globalActivityStatus } from '@/State/GlobalActivityStatus';
import { Text } from 'react-native';

// minimal fake theme containing the required color sections
const fakeTheme = {
    colors: {
        statusProcessing: { background: '', text: '', accent: '', iconBackground: '', shadowColor: '' },
        statusIdle: { background: '', text: '', accent: '', iconBackground: '', shadowColor: '' },
        statusWarning: { background: '', text: '', accent: '', iconBackground: '', shadowColor: '' },
        statusError: { background: '', text: '', accent: '', iconBackground: '', shadowColor: '' },
    },
} as unknown as ExtendedTheme;

// fake translation functions that return the key for visibility
const fakeLL = {
    activity: {
        loading: () => 'loading',
        starting: () => 'starting',
        done: () => 'done',
        warning: () => 'warning',
        error: () => 'error',
    },
} as any;

describe('GlobalActivityBar helpers', () => {
    it('provides non-null colors for all statuses', () => {
        for (const status of [
            ActivityStatus.Pending,
            ActivityStatus.Success,
            ActivityStatus.Warning,
            ActivityStatus.Error,
        ]) {
            const colors = getStatusColors(fakeTheme, status);
            expect(colors).not.toBeNull();
        }

        // ready should return null
        expect(getStatusColors(fakeTheme, ActivityStatus.Ready)).toBeNull();
    });

});

// additional component behaviour tests

describe('GlobalActivityBar component', () => {
    beforeEach(() => {
        globalActivityStatus.reset();
    });

    it('renders hidden bar when store has no active status', () => {
        const { status, message, icon } = readFromStore();
        expect(status).toBe(ActivityStatus.Ready);
        expect(message).toBe('');
        expect(icon).toBeUndefined();
    });

    it('renders message from store when status present', () => {
        globalActivityStatus.setStatus(ActivityStatus.Pending, 'Downloading');
        const { status, message } = readFromStore();
        expect(status).toBe(ActivityStatus.Pending);
        expect(message).toBe('Downloading');
    });

    it('renders custom icon from store when provided', () => {
        globalActivityStatus.setStatus(ActivityStatus.Pending, 'Downloading', <Text>⭐</Text>);
        const { icon } = readFromStore();
        expect(icon).toEqual(<Text>⭐</Text>);
    });
});
