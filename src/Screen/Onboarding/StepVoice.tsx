import { observer } from '@legendapp/state/react';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, useTheme } from 'react-native-paper';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { OnboardingState } from '@/State/Onboarding/State';
import type { ExtendedTheme } from '@/theme/AppTheme';

export const StepVoice = observer(function stepVoice(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useLocalization();
    const actions = theme.colors.actions;
    const error = Container.get(OnboardingState).state.error.get();
    const isBusy = Container.get(OnboardingState).state.isBusy.get();
    const isDownloading = Container.get(OnboardingState).isSpeakerModelDownloading.get();

    return (
        <View style={STYLES.stepRoot}>
            <View style={STYLES.stepBody}>
                <Text style={[STYLES.stepTitle, { color: theme.colors.onBackground }]}>
                    {LL.onboarding.voiceCalibration()}
                </Text>
                <Text style={[STYLES.body, { color: theme.colors.onSurfaceVariant }]}>
                    {LL.onboarding.voiceCalibrationDesc()}
                </Text>
                {error ? (
                    <HelperText type="error" visible>
                        {error}
                    </HelperText>
                ) : null}
                {isBusy ? <ActivityIndicator size="large" style={STYLES.voiceLoader} /> : null}
            </View>
            <View style={STYLES.stepSpacer} />
            {isDownloading ? (
                // model not available yet; show simple loader and message
                <View style={STYLES.loadingContainer}>
                    <ActivityIndicator size="large" />
                    <Text style={[STYLES.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                        {LL.download.speakerModel()}...
                    </Text>
                </View>
            ) : null}
            {!isBusy && !isDownloading ? (
                <>
                    <Button
                        mode="contained"
                        onPress={() => Container.get(OnboardingState).calibrateVoice()}
                        style={[STYLES.primaryButton, { backgroundColor: actions.primary.background }]}
                        contentStyle={STYLES.primaryButtonContent}
                    >
                        {LL.onboarding.startCalibration()}
                    </Button>
                    <Button
                        mode="text"
                        onPress={() => Container.get(OnboardingState).reset()}
                        style={STYLES.backButton}
                        contentStyle={STYLES.primaryButtonContent}
                    >
                        {LL.onboarding.back()}
                    </Button>
                </>
            ) : null}
        </View>
    );
});

const STYLES = StyleSheet.create({
    stepRoot: { flex: 1 },
    stepBody: { flexGrow: 0 },
    stepSpacer: { flex: 1, minHeight: 24 },
    stepTitle: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
    body: { fontSize: 16, marginBottom: 24, lineHeight: 24 },
    voiceLoader: { marginVertical: 24 },
    loadingContainer: { alignItems: 'center', marginVertical: 24 },
    loadingText: { fontSize: 16, marginTop: 8 },
    primaryButton: { marginTop: 0 },
    primaryButtonContent: { minHeight: 48 },
    backButton: { marginTop: 8 },
});
