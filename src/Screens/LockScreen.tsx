import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Button, useTheme, Surface} from 'react-native-paper';
import {Lock, Fingerprint} from 'lucide-react-native';

interface LockScreenProps {}

export function LockScreen(props: LockScreenProps): React.JSX.Element {
    const theme = useTheme();

    const handleUnlock = () => {
        // TODO: Implement biometric authentication
        console.log('Unlock requested');
    };

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.colors.background},
            ]}>
            <Surface
                style={[
                    styles.content,
                    {backgroundColor: theme.colors.surface},
                ]}>
                <View style={styles.iconContainer}>
                    <Lock
                        size={64}
                        color={theme.colors.primary}
                    />
                </View>
                <Text
                    variant="headlineSmall"
                    style={[styles.title, {color: theme.colors.onSurface}]}>
                    Tiro Scribe
                </Text>
                <Text
                    variant="bodyMedium"
                    style={[
                        styles.subtitle,
                        {color: theme.colors.onSurfaceVariant},
                    ]}>
                    Secure medical documentation
                </Text>
                <Button
                    mode="contained"
                    onPress={handleUnlock}
                    icon={({size, color}) => (
                        <Fingerprint size={size} color={color} />
                    )}
                    style={styles.unlockButton}
                    contentStyle={styles.unlockButtonContent}>
                    Unlock with Face ID
                </Button>
            </Surface>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        minWidth: 300,
        elevation: 4,
    },
    iconContainer: {
        marginBottom: 24,
    },
    title: {
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        marginBottom: 32,
        textAlign: 'center',
    },
    unlockButton: {
        marginTop: 16,
    },
    unlockButtonContent: {
        paddingVertical: 8,
    },
});
