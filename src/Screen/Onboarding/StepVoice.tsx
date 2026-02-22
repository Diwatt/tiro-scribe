import { observer } from '@legendapp/state/react';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, useTheme } from 'react-native-paper';
import { useAppLanguage } from '@/Localization';
import { onboardingState } from '@/State/Onboarding';
import type { ExtendedTheme } from '@/theme/AppTheme';

export const StepVoice = observer(function StepVoice(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    const actions = theme.colors.actions;
    const error = onboardingState.state$.error.get();
    const isBusy = onboardingState.state$.isBusy.get();

    return (
        <View style={styles.stepRoot}>
            <View style={styles.stepBody}>
                <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>{LL.onboarding.voiceCalibration()}</Text>
                <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{LL.onboarding.voiceCalibrationDesc()}</Text>
                {error ? (
                    <HelperText type="error" visible>
                        {error}
                    </HelperText>
                ) : null}
                {isBusy ? <ActivityIndicator size="large" style={styles.voiceLoader} /> : null}
            </View>
            <View style={styles.stepSpacer} />
            {!isBusy ? (
                <>
                    <Button
                        mode="contained"
                        onPress={() => onboardingState.calibrateVoice()}
                        style={[styles.primaryButton, { backgroundColor: actions.primary.background }]}
                        contentStyle={styles.primaryButtonContent}
                    >
                        {LL.onboarding.startCalibration()}
                    </Button>
                    <Button mode="text" onPress={() => onboardingState.reset()} style={styles.backButton} contentStyle={styles.primaryButtonContent}>
                        {LL.onboarding.back()}
                    </Button>
                </>
            ) : null}
        </View>
    );
});

const styles = StyleSheet.create({
    stepRoot: { flex: 1 },
    stepBody: { flexGrow: 0 },
    stepSpacer: { flex: 1, minHeight: 24 },
    stepTitle: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
    body: { fontSize: 16, marginBottom: 24, lineHeight: 24 },
    voiceLoader: { marginVertical: 24 },
    primaryButton: { marginTop: 0 },
    primaryButtonContent: { minHeight: 48 },
    backButton: { marginTop: 8 },
});
