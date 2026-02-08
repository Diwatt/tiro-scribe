/**
 * Main app layout – stack with tabs and modal screens (recording, transcript).
 */

import { Stack } from 'expo-router';
import type React from 'react';

export default function MainLayout(): React.JSX.Element {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
                name="recording"
                options={{
                    presentation: 'fullScreenModal',
                    animation: 'fade',
                }}
            />
            <Stack.Screen
                name="transcript/[id]"
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }}
            />
        </Stack>
    );
}
