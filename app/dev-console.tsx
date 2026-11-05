/**
 * Dev console route – raw audio ingestion, encrypted fixtures and encounter
 * fixtures (DEV ONLY).
 *
 * Deep links land directly on this route and bypass the GateScreen boot
 * (app/index.tsx), so the route initializes the Database itself before
 * mounting AudioScreen. Idempotent: a normal boot already initialized it.
 */

import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import type React from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Database } from '@/Database/Database';
import { ENTITY_CLASSES } from '@/Entity';
import { AudioScreen } from '@/DevConsole';

export default function DevConsoleRoute(): React.JSX.Element {
    const theme = useTheme();
    const [isDatabaseReady, setIsDatabaseReady] = useState(false);
    const [failureMessage, setFailureMessage] = useState<string | null>(null);

    useEffect(() => {
        Database.initialize({ entities: ENTITY_CLASSES }).then(
            () => setIsDatabaseReady(true),
            (error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                setFailureMessage(message);
            },
        );
    }, []);

    if (!isDatabaseReady) {
        return (
            <View style={[STYLES.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                {failureMessage != null && (
                    <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 12 }}>
                        {failureMessage}
                    </Text>
                )}
            </View>
        );
    }

    return <AudioScreen />;
}

const STYLES = StyleSheet.create({
    centered: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});
