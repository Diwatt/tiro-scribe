import { Check } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ButtonKind, LargeTitle, NavigationBar, PillButton, ScreenFrame } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { AnalysisStage } from '@/Screen/Model';
import { StageState } from '@/Screen/Model';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    sessionLabel: string;
    stages: ReadonlyArray<AnalysisStage>;
    closestSubject?: string;
    onBack?: () => void;
    onNewSubject?: () => void;
    onConfirmClosest?: () => void;
    onPickOther?: () => void;
}

/** Per-session analysis steps; asks the therapist to confirm an unknown voice. */
export function AnalysisScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const isAsking = props.stages.some((stage) => stage.needsAnswer());

    return (
        <ScreenFrame>
            <NavigationBar backLabel={LL.shell.back()} onBack={props.onBack} />
            <LargeTitle title={LL.analysis.title()} subtitle={props.sessionLabel} isCompact />
            <View style={STYLES.list}>
                {props.stages.map((stage, index) => (
                    <View key={stage.title} style={[STYLES.stage, index < props.stages.length - 1 && STYLES.line]}>
                        <View style={[STYLES.dot, STYLES[stage.state]]}>
                            {stage.state === StageState.Done ? <Check size={12} color={PaperInk.WHITE} strokeWidth={3.4} /> : null}
                            {stage.state === StageState.Ask ? <Text style={STYLES.question}>?</Text> : null}
                        </View>
                        <View style={STYLES.flex}>
                            <Text style={STYLES.title}>{stage.title}</Text>
                            <Text style={[STYLES.detail, stage.needsAnswer() && STYLES.detailAsk]}>{stage.detail}</Text>
                        </View>
                    </View>
                ))}
            </View>
            {isAsking && props.closestSubject ? (
                <View style={STYLES.askCard}>
                    <Text style={STYLES.askTitle}>{LL.analysis.unknownTitle()}</Text>
                    <Text style={STYLES.detail}>{LL.analysis.unknownBody({ name: props.closestSubject })}</Text>
                    <PillButton label={LL.analysis.newSubject()} height={48} onPress={props.onNewSubject} />
                    <View style={STYLES.choices}>
                        <View style={STYLES.flex}>
                            <PillButton
                                label={LL.analysis.itIs({ name: props.closestSubject })}
                                kind={ButtonKind.Outline}
                                height={44}
                                onPress={props.onConfirmClosest}
                            />
                        </View>
                        <View style={STYLES.flex}>
                            <PillButton label={LL.analysis.other()} kind={ButtonKind.Outline} height={44} onPress={props.onPickOther} />
                        </View>
                    </View>
                </View>
            ) : null}
            <Text style={STYLES.footnote}>{LL.analysis.footnote()}</Text>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    askCard: {
        gap: 10,
        padding: 16,
        borderRadius: Metric.RADIUS_CARD,
        borderWidth: 2,
        borderColor: PaperInk.OCHRE,
        backgroundColor: PaperInk.CARD,
    },
    [StageState.Ask]: { backgroundColor: PaperInk.OCHRE },
    askTitle: { fontSize: 16, fontWeight: '700', color: PaperInk.TEXT },
    choices: { flexDirection: 'row', gap: 8 },
    detail: { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED },
    detailAsk: { fontWeight: '600', color: PaperInk.OCHRE_INK },
    [StageState.Done]: { backgroundColor: PaperInk.ACCENT },
    dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1, gap: 1 },
    footnote: { fontSize: 12, lineHeight: 17, color: PaperInk.TEXT_MUTED, paddingHorizontal: 6 },
    line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PaperInk.LINE },
    list: {
        paddingHorizontal: Metric.GUTTER,
        paddingVertical: 4,
        borderRadius: Metric.RADIUS_CARD,
        borderWidth: 1,
        borderColor: PaperInk.LINE,
        backgroundColor: PaperInk.CARD,
    },
    question: { fontSize: 13, fontWeight: '800', color: PaperInk.WHITE },
    [StageState.Running]: { borderWidth: 2, borderColor: PaperInk.ACCENT },
    stage: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 6 },
    title: { fontSize: 15, fontWeight: '600', color: PaperInk.TEXT },
    [StageState.Todo]: { borderWidth: 2, borderColor: PaperInk.LINE_STRONG },
});
