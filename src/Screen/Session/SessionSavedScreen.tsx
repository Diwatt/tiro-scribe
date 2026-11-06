import { Check, Plug } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ButtonKind, PillButton } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    duration: string;
    timeRange: string;
    estimatedMinutes?: number;
    onDone?: () => void;
}

/** End of recording: same dark stage as the recording, frozen timer, charge reminder. */
export function SessionSavedScreen({ duration, timeRange, estimatedMinutes, onDone }: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const insets = useSafeAreaInsets();

    return (
        <View style={[STYLES.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
            <View style={STYLES.badge}>
                <Check size={14} color={PaperInk.ACCENT_ON_DARK} strokeWidth={3} />
                <Text style={STYLES.badgeText}>{LL.sessionSaved.badge()}</Text>
            </View>
            <View style={STYLES.center}>
                <View style={STYLES.rings}>
                    <View style={[STYLES.ring, STYLES.ringOuter]} />
                    <View style={[STYLES.ring, STYLES.ringMiddle]} />
                    <View style={[STYLES.ring, STYLES.ringInner]} />
                    <Text style={TypeScale.TIMER}>{duration}</Text>
                    <Text style={STYLES.range}>{timeRange}</Text>
                </View>
                <Text style={STYLES.body}>{LL.sessionSaved.body()}</Text>
            </View>
            <View style={STYLES.footer}>
                <View style={STYLES.charge}>
                    <Plug size={16} color={PaperInk.OCHRE_ON_DARK} strokeWidth={2.2} />
                    <Text style={STYLES.chargeText}>{estimatedMinutes === undefined
                            ? LL.sessionSaved.chargeShort()
                            : LL.sessionSaved.charge({ minutes: estimatedMinutes })}</Text>
                </View>
                <View style={STYLES.button}>
                    <PillButton label={LL.sessionSaved.back()} kind={ButtonKind.Light} height={68} onPress={onDone} />
                </View>
            </View>
        </View>
    );
}

const STYLES = StyleSheet.create({
    badge: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: 'rgba(143,217,194,0.12)',
    },
    badgeText: { fontSize: 13, fontWeight: '600', color: PaperInk.ACCENT_ON_DARK },
    body: { maxWidth: 280, textAlign: 'center', fontSize: 15, lineHeight: 21, color: PaperInk.NIGHT_TEXT_MUTED },
    button: { alignSelf: 'stretch' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 30 },
    charge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 48,
        paddingHorizontal: 18,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    chargeText: { fontSize: 14, color: PaperInk.NIGHT_TEXT_SOFT },
    footer: { alignItems: 'center', gap: 18 },
    range: { fontSize: 13, color: PaperInk.NIGHT_TEXT_MUTED, marginTop: 6 },
    ring: { position: 'absolute', borderRadius: 999 },
    ringInner: { width: 156, height: 156, backgroundColor: 'rgba(143,217,194,0.07)' },
    ringMiddle: { width: 208, height: 208, borderWidth: 1, borderColor: 'rgba(143,217,194,0.18)' },
    ringOuter: { width: 260, height: 260, borderWidth: 1, borderColor: 'rgba(143,217,194,0.10)' },
    rings: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
    root: { flex: 1, paddingHorizontal: 24, backgroundColor: PaperInk.NIGHT },
});
