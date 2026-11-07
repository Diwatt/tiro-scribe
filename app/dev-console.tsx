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
import { Container } from '@/Core/Container';
import { CryptoEngine, DatabaseKeyfile } from '@/Security';

export default function DevConsoleRoute(): React.JSX.Element {
    const theme = useTheme();
    const [isDatabaseReady, setIsDatabaseReady] = useState(false);
    const [failureMessage, setFailureMessage] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                // Deep links bypass the GateScreen auth: reuse the RAM key when a normal
                // boot already unlocked, refuse when the vault is still locked, bootstrap
                // on a fresh install.
                let dbKey = '';
                try {
                    dbKey = Database.getDatabaseKey();
                } catch {
                    if (await Container.get(DatabaseKeyfile).exists()) {
                        setFailureMessage('Database locked: unlock the app once before using the dev console.');
                        return;
                    }
                    dbKey = Container.get(CryptoEngine).randomKey(32);
                }

                await Database.initialize({ entities: ENTITY_CLASSES, dbKey });
                setIsDatabaseReady(true);
            } catch (error: unknown) {
                setFailureMessage(error instanceof Error ? error.message : String(error));
            }
        })();
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
