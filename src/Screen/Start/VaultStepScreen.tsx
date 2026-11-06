import { Check, CircleAlert, TriangleAlert } from 'lucide-react-native';
import type React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Notice, PillButton, ProgressBar } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { LanguageOption } from '@/Screen/Model';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';
import { OnboardingStepFrame } from './OnboardingStepFrame';

interface Props {
    step: number;
    total: number;
    languages: ReadonlyArray<LanguageOption>;
    selectedLanguages: ReadonlyArray<string>;
    email: string;
    password: string;
    confirmation: string;
    strength: number;
    strengthLabel: string;
    error?: string;
    isBusy?: boolean;
    onToggleLanguage?: (language: string) => void;
    onEmailChange?: (value: string) => void;
    onPasswordChange?: (value: string) => void;
    onConfirmationChange?: (value: string) => void;
    onSubmit?: () => void;
    onBack?: () => void;
}

/** Onboarding step 1/4: session languages and master password in a single screen. */
export function VaultStepScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const fields = [
        [LL.vault.email(), props.email, props.onEmailChange, false],
        [LL.vault.password(), props.password, props.onPasswordChange, true],
        [LL.vault.confirm(), props.confirmation, props.onConfirmationChange, true],
    ] as const;

    return (
        <OnboardingStepFrame
            step={props.step}
            total={props.total}
            overline={LL.vault.step({ current: props.step })}
            title={LL.vault.title()}
            subtitle={LL.vault.subtitle()}
            onBack={props.onBack}
            footer={
                <PillButton
                    label={props.isBusy ? LL.vault.creating() : LL.vault.create()}
                    onPress={props.onSubmit}
                    isDisabled={props.isBusy}
                />
            }
        >
            <Text style={STYLES.label}>{LL.vault.languages()}</Text>
            <View style={STYLES.chips}>
                {props.languages.map((language) => {
                    const isOn = props.selectedLanguages.includes(language.code);

                    return (
                        <Pressable
                            key={language.code}
                            onPress={() => props.onToggleLanguage?.(language.code)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: isOn }}
                            style={[STYLES.chip, isOn ? STYLES.chipOn : STYLES.chipOff]}
                        >
                            {isOn ? <Check size={14} color={PaperInk.CARD} strokeWidth={3} /> : null}
                            <Text style={[STYLES.chipText, isOn && STYLES.chipTextOn]}>{language.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
            <View style={STYLES.form}>
                {fields.map(([label, value, onChange, isSecret], index) => (
                    <View key={label} style={[STYLES.field, index < fields.length - 1 && STYLES.fieldLine]}>
                        <Text style={STYLES.fieldLabel}>{label}</Text>
                        <TextInput
                            value={value}
                            onChangeText={onChange}
                            secureTextEntry={isSecret}
                            autoCapitalize="none"
                            accessibilityLabel={label}
                            style={STYLES.input}
                        />
                    </View>
                ))}
            </View>
            <ProgressBar progress={props.strength} height={4} label={props.strengthLabel} />
            {props.strengthLabel ? <Text style={STYLES.strength}>{props.strengthLabel}</Text> : null}
            {props.error ? <Notice text={props.error} icon={CircleAlert} tone={Tone.Danger} /> : null}
            <Notice text={LL.vault.warning()} icon={TriangleAlert} tone={Tone.Ochre} />
        </OnboardingStepFrame>
    );
}

const STYLES = StyleSheet.create({
    chip: {
        minHeight: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
    },
    chipOff: { backgroundColor: PaperInk.CARD, borderColor: PaperInk.LINE_STRONG },
    chipOn: { backgroundColor: PaperInk.INK, borderColor: PaperInk.INK },
    chipText: { fontSize: 15, fontWeight: '500', color: PaperInk.TEXT },
    chipTextOn: { color: PaperInk.CARD, fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    field: { paddingHorizontal: Metric.GUTTER, paddingVertical: 10, gap: 2 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: PaperInk.TEXT_MUTED },
    fieldLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PaperInk.LINE },
    form: {
        backgroundColor: PaperInk.CARD,
        borderWidth: 1,
        borderColor: PaperInk.LINE,
        borderRadius: Metric.RADIUS_CARD,
    },
    input: { fontSize: 17, color: PaperInk.TEXT, paddingVertical: 4 },
    label: { fontSize: 13, fontWeight: '600', color: PaperInk.TEXT_MUTED, paddingHorizontal: 4 },
    strength: { fontSize: 13, fontWeight: '600', color: PaperInk.ACCENT, paddingHorizontal: 4, marginTop: -8 },
});
