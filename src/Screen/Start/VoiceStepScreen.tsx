import { CircleAlert, Lock, Mic, Square } from 'lucide-react-native';
import type React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Notice, Panel, PillButton } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { CalibrationStatus } from '@/Screen/Model';
import { FontFamily } from '@/theme/FontFamily';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';
import { OnboardingStepFrame } from './OnboardingStepFrame';

interface Props {
    step: number;
    total: number;
    status: CalibrationStatus;
    error?: string;
    onStart?: () => void;
    onGrantPermission?: () => void;
    onBack?: () => void;
}

/** Onboarding voice step: read a passage aloud so Tiro learns the therapist's voice print. */
export function VoiceStepScreen({ step, total, status, error, onStart, onGrantPermission, onBack }: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const isRecording = status === CalibrationStatus.Recording;
    const isWaiting = status === CalibrationStatus.Downloading || status === CalibrationStatus.Processing;

    return (
        <OnboardingStepFrame
            step={step}
            total={total}
            overline={LL.voiceStep.step({ current: step })}
            title={LL.voiceStep.title()}
            subtitle={LL.voiceStep.subtitle()}
            onBack={onBack}
            footer={
                <View style={STYLES.footer}>
                    {status === CalibrationStatus.NeedsPermission ? (
                        <PillButton label={LL.onboarding.grantPermission()} icon={Mic} onPress={onGrantPermission} />
                    ) : (
                        <Pressable
                            onPress={onStart}
                            disabled={status !== CalibrationStatus.Ready}
                            accessibilityRole="button"
                            accessibilityLabel={LL.onboarding.startCalibration()}
                            style={[STYLES.record, status !== CalibrationStatus.Ready && !isRecording && STYLES.dimmed]}
                        >
                            {isWaiting ? (
                                <ActivityIndicator color={PaperInk.WHITE} />
                            ) : isRecording ? (
                                <Square size={22} color={PaperInk.WHITE} fill={PaperInk.WHITE} />
                            ) : (
                                <Mic size={26} color={PaperInk.WHITE} strokeWidth={2.2} />
                            )}
                        </Pressable>
                    )}
                    <Text style={STYLES.status}>
                        {status === CalibrationStatus.Downloading
                            ? LL.download.speakerModel()
                            : isRecording
                              ? LL.onboarding.voiceRecording()
                              : status === CalibrationStatus.Processing
                                ? LL.onboarding.voiceProcessing()
                                : status === CalibrationStatus.NeedsPermission
                                  ? LL.onboarding.permissionRequired()
                                  : LL.onboarding.startCalibration()}
                    </Text>
                    <View style={STYLES.privacy}>
                        <Lock size={13} color={PaperInk.TEXT_MUTED} strokeWidth={2.4} />
                        <Text style={STYLES.privacyText}>{LL.voiceStep.footnote()}</Text>
                    </View>
                </View>
            }
        >
            <Panel>
                <Text style={STYLES.passage}>{LL.voiceStep.passage()}</Text>
            </Panel>
            {error ? <Notice text={error} icon={CircleAlert} tone={Tone.Danger} /> : null}
        </OnboardingStepFrame>
    );
}

const STYLES = StyleSheet.create({
    dimmed: { opacity: 0.5 },
    footer: { alignItems: 'center', gap: 12 },
    passage: { fontSize: 23, lineHeight: 33, fontFamily: FontFamily.READING, color: PaperInk.TEXT_READING },
    privacy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    privacyText: { fontSize: 13, color: PaperInk.TEXT_MUTED },
    record: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: PaperInk.INK,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 5,
        borderColor: PaperInk.TRACK,
    },
    status: { fontSize: 15, fontWeight: '600', color: PaperInk.TEXT, textAlign: 'center' },
});
