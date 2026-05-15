import { observer } from '@legendapp/state/react';
import { Mic } from 'lucide-react-native';
import type React from 'react';
import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { OnboardingState } from '@/State/Onboarding/State';
import type { ExtendedTheme } from '@/theme/AppTheme';

const MIC_PULSE_SIZE = 56;
const MIC_PULSE_RADIUS = MIC_PULSE_SIZE / 2;
const MIC_INNER_SIZE = 32;

export const StepVoice = observer(function stepVoice(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useLocalization();
    const actions = theme.colors.actions;
    const onboarding = Container.get(OnboardingState);
    const error = onboarding.voice.error.get();
    const hasPermission = onboarding.voice.hasPermission.get();
    const isBusy = onboarding.voice.isBusy.get();
    const phase = onboarding.voice.calibrationPhase.get();
    const isDownloading = onboarding.voice.isSpeakerModelDownloading.get();

    const startCalibration = useCallback(() => onboarding.voice.calibrateVoice(), [onboarding]);
    const handleGrantPermission = useCallback(() => onboarding.voice.requestPermission(), [onboarding]);
    const resetOnboarding = useCallback(() => onboarding.reset(), [onboarding]);

    // Shared value that animates 0 <-> 1 while recording.
    const colorPulse = useSharedValue<number>(0);

    useEffect(() => {
        if (phase === 'recording') {
            // Repeat a ping-pong animation between 0 and 1.
            colorPulse.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
        } else {
            // Reset quickly when leaving recording.
            colorPulse.value = withTiming(0, { duration: 120 });
        }
    }, [phase, colorPulse]);

    const startColor = theme.colors.statusBatchWaiting.accent;
    const endColor = theme.colors.statusError?.accent ?? '#ff3b30';

    // Two overlay styles: start fades out (opacity 1->0), end fades in (0->1)
    const startOverlayStyle = useAnimatedStyle(() => ({
        opacity: 1 - colorPulse.value,
    }));
    const endOverlayStyle = useAnimatedStyle(() => ({
        opacity: colorPulse.value,
    }));

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

                {isBusy ? (
                    <View style={STYLES.centeredStatus}>
                        {phase === 'recording' ? (
                            <View style={[STYLES.micPulse, { borderColor: theme.colors.surface }]}>
                                {/* start color overlay */}
                                <Animated.View
                                    style={[
                                        StyleSheet.absoluteFillObject,
                                        {
                                            borderRadius: MIC_PULSE_RADIUS,
                                            backgroundColor: startColor,
                                        },
                                        startOverlayStyle,
                                    ]}
                                />
                                {/* end color overlay */}
                                <Animated.View
                                    style={[
                                        StyleSheet.absoluteFillObject,
                                        {
                                            borderRadius: MIC_PULSE_RADIUS,
                                            backgroundColor: endColor,
                                        },
                                        endOverlayStyle,
                                    ]}
                                />
                                <View style={STYLES.micInner}>
                                    <Mic size={18} color={theme.colors.surface} />
                                </View>
                            </View>
                        ) : (
                            <ActivityIndicator
                                size="large"
                                style={STYLES.voiceLoader}
                                color={theme.colors.statusProcessing.accent}
                            />
                        )}

                        <Text style={[STYLES.body, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
                            {phase === 'recording' ? LL.onboarding.voiceRecording() : LL.onboarding.voiceProcessing()}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={STYLES.stepSpacer} />

            {isDownloading ? (
                <View style={STYLES.loadingContainer}>
                    <ActivityIndicator size="large" />
                    <Text style={[STYLES.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                        {LL.download.speakerModel()}...
                    </Text>
                </View>
            ) : null}

            {!isBusy && !isDownloading && !hasPermission ? (
                <>
                    <HelperText type="info" visible>
                        {LL.onboarding.permissionRequired()}
                    </HelperText>
                    <Button
                        mode="contained"
                        onPress={handleGrantPermission}
                        style={[STYLES.primaryButton, { backgroundColor: actions.primary.background }]}
                        contentStyle={STYLES.primaryButtonContent}
                    >
                        {LL.onboarding.grantPermission()}
                    </Button>
                    <Button
                        mode="text"
                        onPress={resetOnboarding}
                        style={STYLES.backButton}
                        contentStyle={STYLES.primaryButtonContent}
                    >
                        {LL.onboarding.back()}
                    </Button>
                </>
            ) : null}

            {!isBusy && !isDownloading && hasPermission ? (
                <>
                    <Button
                        mode="contained"
                        onPress={startCalibration}
                        style={[STYLES.primaryButton, { backgroundColor: actions.primary.background }]}
                        contentStyle={STYLES.primaryButtonContent}
                    >
                        {LL.onboarding.startCalibration()}
                    </Button>
                    <Button
                        mode="text"
                        onPress={resetOnboarding}
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
    centeredStatus: { alignItems: 'center', marginVertical: 24 },

    micPulse: {
        width: MIC_PULSE_SIZE,
        height: MIC_PULSE_SIZE,
        borderRadius: MIC_PULSE_RADIUS,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },

    micInner: {
        width: MIC_INNER_SIZE,
        height: MIC_INNER_SIZE,
        borderRadius: MIC_INNER_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },

    loadingContainer: { alignItems: 'center', marginVertical: 24 },
    loadingText: { fontSize: 16, marginTop: 8 },
    primaryButton: { marginTop: 0 },
    primaryButtonContent: { minHeight: 48 },
    backButton: { marginTop: 8 },
});
