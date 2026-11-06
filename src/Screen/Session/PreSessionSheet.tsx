import { Check, X } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton, RoundIconButton, SegmentedControl, SwitchRow, Tag } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { SubjectSummary } from '@/Screen/Model';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    isManual: boolean;
    subject?: SubjectSummary;
    lastSummary?: string;
    checks: ReadonlyArray<string>;
    isDoNotDisturb: boolean;
    onModeChange?: (isManual: boolean) => void;
    onChangeSubject?: () => void;
    onDoNotDisturbChange?: (isOn: boolean) => void;
    onStart?: () => void;
    onClose?: () => void;
}

/** Bottom sheet before recording: subject (auto or chosen, with last-session recap), checks, start. */
export function PreSessionSheet(props: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const insets = useSafeAreaInsets();

    return (
        <View style={STYLES.backdrop}>
            <View style={[STYLES.sheet, { paddingBottom: insets.bottom + 20 }]}>
                <View style={STYLES.grabber} />
                <View style={STYLES.header}>
                    <Text style={[TypeScale.TITLE, STYLES.title]}>{LL.preSession.title()}</Text>
                    <RoundIconButton icon={X} label={LL.shell.close()} onPress={props.onClose} />
                </View>
                <Text style={STYLES.label}>{LL.preSession.who()}</Text>
                <SegmentedControl
                    label={LL.preSession.who()}
                    options={[LL.preSession.auto(), LL.preSession.manual()]}
                    selectedIndex={props.isManual ? 1 : 0}
                    onChange={(index) => props.onModeChange?.(index === 1)}
                />
                {props.isManual && props.subject ? (
                    <View style={STYLES.recap}>
                        <View style={STYLES.subjectRow}>
                            <Text style={STYLES.avatar}>{props.subject.getInitial()}</Text>
                            <View style={STYLES.flex}>
                                <Text style={STYLES.subjectName}>{props.subject.name}</Text>
                                <Text style={STYLES.muted}>{props.subject.lastSeen}</Text>
                            </View>
                            <Text style={STYLES.link} onPress={props.onChangeSubject} accessibilityRole="button">
                                {LL.preSession.change()}
                            </Text>
                        </View>
                        {props.lastSummary ? (
                            <Text style={STYLES.summary}>
                                <Text style={STYLES.strong}>{LL.preSession.lastTime()} </Text>
                                {props.lastSummary}
                            </Text>
                        ) : null}
                    </View>
                ) : (
                    <Text style={STYLES.muted}>{LL.preSession.autoHint()}</Text>
                )}
                <View style={STYLES.checks}>
                    {props.checks.map((check) => (
                        <Tag key={check} label={check} tone={Tone.Accent} icon={Check} />
                    ))}
                </View>
                <SwitchRow
                    title={LL.preSession.doNotDisturb()}
                    detail={LL.preSession.doNotDisturbDetail()}
                    isOn={props.isDoNotDisturb}
                    onChange={props.onDoNotDisturbChange}
                />
                <PillButton label={LL.preSession.start()} onPress={props.onStart} height={60} />
                <Text style={[STYLES.muted, STYLES.centered]}>{LL.preSession.footnote()}</Text>
            </View>
        </View>
    );
}

const STYLES = StyleSheet.create({
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: PaperInk.INK,
        color: PaperInk.PAPER,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 36,
    },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: PaperInk.SCRIM },
    centered: { textAlign: 'center' },
    checks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    flex: { flex: 1, gap: 1 },
    grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: PaperInk.LINE_STRONG },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 13, fontWeight: '600', color: PaperInk.TEXT_MUTED },
    link: { fontSize: 14, fontWeight: '600', color: PaperInk.ACCENT },
    muted: { fontSize: 14, lineHeight: 20, color: PaperInk.TEXT_MUTED },
    recap: {
        gap: 8,
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: PaperInk.LINE,
        backgroundColor: PaperInk.PAPER,
    },
    sheet: {
        gap: 14,
        paddingHorizontal: 20,
        paddingTop: 10,
        borderTopLeftRadius: Metric.RADIUS_SHEET,
        borderTopRightRadius: Metric.RADIUS_SHEET,
        backgroundColor: PaperInk.CARD,
    },
    strong: { fontWeight: '600', color: PaperInk.TEXT },
    subjectName: { fontSize: 16, fontWeight: '600', color: PaperInk.TEXT },
    subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    summary: { fontSize: 14, lineHeight: 20, color: PaperInk.TEXT_READING },
    title: { fontSize: 26 },
});
