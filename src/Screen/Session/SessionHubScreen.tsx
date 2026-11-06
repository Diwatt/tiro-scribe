import { AlignLeft, Check, ChevronRight, Lock, MoreHorizontal, Share, Sparkles } from 'lucide-react-native';
import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Disclosure, Fact, FactGrid, NavigationBar, Panel, RoundIconButton, ScreenFrame } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    subjectName: string;
    rank: number;
    daysSincePrevious: number;
    title: string;
    time: string;
    duration: string;
    summary?: string;
    note?: string;
    lineCount: number;
    onBack?: () => void;
    onExport?: () => void;
    onMore?: () => void;
    onOpenAnalysis?: () => void;
    onGenerateSummary?: () => void;
    onEditNote?: () => void;
    onOpenTranscript?: () => void;
}

/** One session: metadata, analysis status, mini summary, session notes, link to the transcript. */
export function SessionHubScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const facts = [
        Fact.create(LL.session.time(), props.time),
        Fact.create(LL.session.duration(), props.duration),
        Fact.create(LL.session.subject(), LL.session.recognised()),
    ];

    return (
        <ScreenFrame>
            <NavigationBar
                backLabel={props.subjectName}
                onBack={props.onBack}
                trailing={
                    <>
                        <RoundIconButton icon={Share} label={LL.shell.export()} onPress={props.onExport} />
                        <RoundIconButton icon={MoreHorizontal} label={LL.shell.more()} onPress={props.onMore} />
                    </>
                }
            />
            <View style={STYLES.heading}>
                <Text style={TypeScale.OVERLINE}>
                    {LL.session.nth({ rank: props.rank })} · {LL.session.sinceLast({ days: props.daysSincePrevious })}
                </Text>
                <Text style={TypeScale.TITLE} accessibilityRole="header">
                    {props.title}
                </Text>
            </View>
            <FactGrid facts={facts} columns={3} />
            <Pressable onPress={props.onOpenAnalysis} accessibilityRole="button" style={STYLES.status}>
                <Check size={18} color={PaperInk.ACCENT_DEEP} strokeWidth={2.6} />
                <Text style={STYLES.statusText}>{LL.session.analysisDone()}</Text>
                <Text style={STYLES.statusLink}>{LL.session.details()}</Text>
            </Pressable>
            <Panel>
                {props.summary ? (
                    <Disclosure title={LL.session.summary()} body={props.summary} icon={Sparkles} isInitiallyOpen />
                ) : (
                    <View style={STYLES.row}>
                        <Sparkles size={16} color={PaperInk.ACCENT} strokeWidth={2.2} />
                        <View style={STYLES.flex}>
                            <Text style={STYLES.strong}>{LL.session.summary()}</Text>
                            <Text style={TypeScale.CAPTION}>{LL.session.summaryDetail()}</Text>
                        </View>
                        <Text style={STYLES.generate} onPress={props.onGenerateSummary} accessibilityRole="button">
                            {LL.session.generate()}
                        </Text>
                    </View>
                )}
            </Panel>
            <Panel>
                <View style={STYLES.row}>
                    <Text style={[STYLES.strong, STYLES.flex]}>{LL.session.notes()}</Text>
                    <Lock size={12} color={PaperInk.TEXT_MUTED} strokeWidth={2.4} />
                    <Text style={TypeScale.FOOTNOTE}>{LL.shell.encrypted()}</Text>
                </View>
                {props.note ? <Text style={STYLES.note}>{props.note}</Text> : null}
                <Text style={STYLES.link} onPress={props.onEditNote} accessibilityRole="button">
                    {LL.session.edit()}
                </Text>
            </Panel>
            <Pressable onPress={props.onOpenTranscript} accessibilityRole="button" style={STYLES.transcript}>
                <AlignLeft size={20} color={PaperInk.PAPER} strokeWidth={2.2} />
                <View style={STYLES.flex}>
                    <Text style={STYLES.transcriptTitle}>{LL.session.read()}</Text>
                    <Text style={STYLES.transcriptDetail}>{LL.session.readDetail({ lines: props.lineCount })}</Text>
                </View>
                <ChevronRight size={16} color={PaperInk.PAPER} strokeWidth={2.6} />
            </Pressable>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    flex: { flex: 1, gap: 1 },
    generate: {
        overflow: 'hidden',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 17,
        backgroundColor: PaperInk.INK,
        color: PaperInk.CARD,
        fontWeight: '600',
    },
    heading: { gap: 4, paddingHorizontal: 4 },
    link: { fontSize: 14, fontWeight: '600', color: PaperInk.ACCENT },
    note: { fontSize: 15, lineHeight: 21, color: PaperInk.TEXT_READING },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    status: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 48,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: PaperInk.ACCENT_SOFT,
    },
    statusLink: { fontSize: 14, fontWeight: '600', color: PaperInk.ACCENT_DEEP },
    statusText: { flex: 1, fontSize: 15, fontWeight: '600', color: PaperInk.ACCENT_DEEP },
    strong: { fontSize: 15, fontWeight: '600', color: PaperInk.TEXT },
    transcript: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 60,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: PaperInk.INK,
    },
    transcriptDetail: { fontSize: 13, color: PaperInk.ON_DARK_MUTED },
    transcriptTitle: { fontSize: 16, fontWeight: '600', color: PaperInk.PAPER },
});
