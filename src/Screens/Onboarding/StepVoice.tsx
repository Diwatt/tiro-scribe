import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ActivityIndicator, Button, HelperText } from 'react-native-paper';
import { onboardingState } from '@/State/Onboarding';
import type { StepProps } from './Screen';

const styles = StyleSheet.create({
    stepTitle: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
    body: { fontSize: 16, marginBottom: 24, lineHeight: 24 },
    voiceLoader: { marginVertical: 24 },
    primaryButton: { marginTop: 16 },
    primaryButtonContent: { minHeight: 48 },
    backButton: { marginTop: 8 },
});

export function StepVoice(props: StepProps): React.JSX.Element {
    const { theme, actions, error, isBusy } = props;
    return (
        <>
            <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>Voice calibration</Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
                Read this text to calibrate your secure profile. We'll record about 5 seconds, then use the embedded speaker model to create
                your voice profile. The recording is deleted immediately.
            </Text>
            {error ? (
                <HelperText type="error" visible>
                    {error}
                </HelperText>
            ) : null}
            {isBusy ? (
                <ActivityIndicator size="large" style={styles.voiceLoader} />
            ) : (
                <>
                    <Button
                        mode="contained"
                        onPress={() => onboardingState.calibrateVoice()}
                        style={[styles.primaryButton, { backgroundColor: actions.primary.background }]}
                        contentStyle={styles.primaryButtonContent}
                    >
                        Start calibration
                    </Button>
                    <Button
                        mode="text"
                        onPress={() => onboardingState.reset()}
                        style={styles.backButton}
                        contentStyle={styles.primaryButtonContent}
                    >
                        Back
                    </Button>
                </>
            )}
        </>
    );
}
