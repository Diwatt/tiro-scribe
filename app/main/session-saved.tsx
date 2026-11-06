/**
 * Session saved – shown right after a recording ends; params: duration, range.
 */

import { useLocalSearchParams } from 'expo-router';
import type React from 'react';
import { AppRouter } from '@/Core/AppRouter';
import { Container } from '@/Core/Container';
import { SessionSavedScreen } from '@/Screen/Session/SessionSavedScreen';

export default function SessionSavedRoute(): React.JSX.Element {
    const { duration, range } = useLocalSearchParams<{ duration?: string; range?: string }>();

    return (
        <SessionSavedScreen
            duration={duration ?? ''}
            timeRange={range ?? ''}
            onDone={() => Container.get(AppRouter).replace('/main')}
        />
    );
}
