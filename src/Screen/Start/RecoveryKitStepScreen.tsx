import { Check, CircleAlert, Copy, Printer } from 'lucide-react-native';
import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ButtonKind, Notice, Panel, PillButton } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';
import { OnboardingStepFrame } from './OnboardingStepFrame';

interface Props {
    step: number;
    total: number;
    codeGroups: ReadonlyArray<string>;
    isStored: boolean;
    isCopied?: boolean;
    error?: string;
    onToggleStored?: () => void;
    onPrint?: () => void;
    onCopy?: () => void;
    onContinue?: () => void;
}

/** Onboarding step 3/4: shows the recovery code; continuing requires confirming it is stored. */
export function RecoveryKitStepScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <OnboardingStepFrame
            step={props.step}
            total={props.total}
            overline={LL.kitStep.step({ current: props.step })}
            title={LL.kitStep.title()}
            subtitle={LL.kitStep.subtitle()}
            footer={<PillButton label={LL.kitStep.continue()} onPress={props.onContinue} isDisabled={!props.isStored} />}
        >
            <Panel isDark>
                <View style={STYLES.code}>
                    {props.codeGroups.map((group, index) => (
                        <Text key={`${group}-${index}`} style={STYLES.group}>
                            {group}
                        </Text>
                    ))}
                </View>
            </Panel>
            <View style={STYLES.actions}>
                <View style={STYLES.action}>
                    <PillButton label={LL.kitStep.share()} icon={Printer} kind={ButtonKind.Outline} height={48} onPress={props.onPrint} />
                </View>
                <View style={STYLES.action}>
                    <PillButton label={props.isCopied ? LL.kitStep.copied() : LL.kitStep.copy()} icon={Copy} kind={ButtonKind.Outline} height={48} onPress={props.onCopy} />
                </View>
            </View>
            <Pressable
                onPress={props.onToggleStored}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: props.isStored }}
                style={STYLES.check}
            >
                <View style={[STYLES.box, props.isStored && STYLES.boxOn]}>
                    {props.isStored ? <Check size={16} color={PaperInk.WHITE} strokeWidth={3} /> : null}
                </View>
                <Text style={STYLES.checkText}>{LL.kitStep.stored()}</Text>
            </Pressable>
            {props.error ? <Notice text={props.error} icon={CircleAlert} tone={Tone.Danger} /> : null}
        </OnboardingStepFrame>
    );
}

const STYLES = StyleSheet.create({
    action: { flex: 1 },
    actions: { flexDirection: 'row', gap: 10 },
    box: {
        width: 26,
        height: 26,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: PaperInk.LINE_STRONG,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boxOn: { backgroundColor: PaperInk.ACCENT, borderColor: PaperInk.ACCENT },
    check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 4 },
    checkText: { flex: 1, fontSize: 16, color: PaperInk.TEXT },
    code: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingVertical: 8 },
    group: { fontSize: 22, fontWeight: '600', letterSpacing: 2, color: PaperInk.CARD, fontVariant: ['tabular-nums'] },
});
