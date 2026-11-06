import { FileText, Lock, Mic, Plug } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconTile, Panel, TiroMark } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';

/** Empty state of the sessions home: what happens from recording to reading, before any session exists. */
export function FirstSessionGuide(): React.JSX.Element {
    const { LL } = useLocalization();
    const steps = [
        { icon: Mic, tone: Tone.Neutral, title: LL.homeScreen.emptyRecordTitle(), body: LL.homeScreen.emptyRecordBody() },
        { icon: Plug, tone: Tone.Ochre, title: LL.homeScreen.emptyChargeTitle(), body: LL.homeScreen.emptyChargeBody() },
        { icon: FileText, tone: Tone.Accent, title: LL.homeScreen.emptyReadTitle(), body: LL.homeScreen.emptyReadBody() },
    ];

    return (
        <Panel>
            <View style={STYLES.head}>
                <View style={STYLES.mark}>
                    <TiroMark size={44} />
                </View>
                <View style={STYLES.flex}>
                    <Text style={STYLES.title}>{LL.homeScreen.emptyTitle()}</Text>
                    <Text style={STYLES.body}>{LL.homeScreen.emptyBody()}</Text>
                </View>
            </View>
            {steps.map((step, index) => (
                <View key={step.title} style={STYLES.step}>
                    <View style={STYLES.rail}>
                        <IconTile icon={step.icon} tone={step.tone} size={36} isRound />
                        {index < steps.length - 1 ? <View style={STYLES.line} /> : null}
                    </View>
                    <View style={[STYLES.flex, STYLES.stepText]}>
                        <Text style={STYLES.stepTitle}>{step.title}</Text>
                        <Text style={STYLES.body}>{step.body}</Text>
                    </View>
                </View>
            ))}
            <View style={STYLES.footer}>
                <Lock size={12} color={PaperInk.TEXT_MUTED} strokeWidth={2.4} />
                <Text style={STYLES.footerText}>{LL.homeScreen.onDevice()}</Text>
            </View>
        </Panel>
    );
}

const STYLES = StyleSheet.create({
    body: { fontSize: 14, lineHeight: 20, color: PaperInk.TEXT_MUTED },
    flex: { flex: 1, gap: 2 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
    footerText: { fontSize: 12, color: PaperInk.TEXT_MUTED },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
    line: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, backgroundColor: PaperInk.LINE },
    mark: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: PaperInk.BRAND_GROUND,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rail: { alignItems: 'center', width: 36 },
    step: { flexDirection: 'row', gap: 12, minHeight: 64 },
    stepText: { paddingTop: 7, paddingBottom: 10 },
    stepTitle: { fontSize: 16, fontWeight: '600', color: PaperInk.TEXT },
    title: { fontSize: 18, fontWeight: '700', color: PaperInk.TEXT },
});
