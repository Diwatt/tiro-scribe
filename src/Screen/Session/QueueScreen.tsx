import { Trash2, Zap } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GroupedList, LargeTitle, ListRow, NavigationBar, Panel, ProgressBar, ScreenFrame, SectionLabel } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { QueuedSession, RunningSession } from '@/Screen/Model';
import { StageState } from '@/Screen/Model';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    isCharging: boolean;
    remainingMinutes: number;
    totalCount: number;
    overallProgress: number;
    current?: RunningSession;
    next: ReadonlyArray<QueuedSession>;
    onBack?: () => void;
    onResume?: (id: string) => void;
}

/** Transcription queue: charging banner, current session stages, sessions waiting. */
export function QueueScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame>
            <NavigationBar backLabel={LL.homeScreen.title()} onBack={props.onBack} />
            <LargeTitle title={LL.queue.title()} />
            {props.isCharging ? (
                <View style={STYLES.banner}>
                    <View style={STYLES.bannerRow}>
                        <Zap size={20} color={PaperInk.ACCENT_ON_DARK} strokeWidth={2.2} />
                        <View style={STYLES.flex}>
                            <Text style={STYLES.bannerTitle}>{LL.queue.charging()}</Text>
                            <Text style={STYLES.bannerDetail}>
                                {LL.queue.remaining({ minutes: props.remainingMinutes, count: props.totalCount })}
                            </Text>
                        </View>
                    </View>
                    <ProgressBar
                        progress={props.overallProgress}
                        color={PaperInk.ACCENT_ON_DARK}
                        track="rgba(255,255,255,0.14)"
                        label={LL.queue.charging()}
                    />
                </View>
            ) : null}
            {props.current ? (
                <Panel>
                    <View style={STYLES.currentHead}>
                        <Text style={STYLES.strong}>{props.current.label}</Text>
                        <Text style={STYLES.muted}>{props.current.duration}</Text>
                    </View>
                    <View style={STYLES.stages}>
                        {props.current.stages.map((stage) => (
                            <View key={stage.title} style={STYLES.stage}>
                                <ProgressBar
                                    progress={stage.state === StageState.Done ? 1 : stage.state === StageState.Running ? (props.current?.runningProgress ?? 0) : 0}
                                    height={5}
                                    label={stage.title}
                                />
                                <Text style={[STYLES.stageLabel, stage.state === StageState.Todo && STYLES.muted]}>{stage.title}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={STYLES.muted}>{LL.queue.resumes()}</Text>
                </Panel>
            ) : null}
            {props.next.length > 0 ? (
                <>
                    <SectionLabel label={LL.queue.next()} />
                    <GroupedList>
                        {props.next.map((session) => (
                            <ListRow
                                key={session.id}
                                title={session.label}
                                detail={
                                    session.isInterrupted()
                                        ? LL.queue.interrupted({ percent: session.interruptedPercent })
                                        : session.detail
                                }
                                trailing={
                                    !session.isInterrupted() ? undefined : (
                                        <Text style={STYLES.resume} onPress={() => props.onResume?.(session.id)}>
                                            {LL.queue.resume()}
                                        </Text>
                                    )
                                }
                            />
                        ))}
                    </GroupedList>
                </>
            ) : null}
            <View style={STYLES.footnote}>
                <Trash2 size={16} color={PaperInk.TEXT_MUTED} strokeWidth={2} />
                <Text style={[STYLES.muted, STYLES.flex]}>{LL.queue.destroyed()}</Text>
            </View>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    banner: { gap: 14, padding: 18, borderRadius: 22, backgroundColor: PaperInk.ACCENT_NIGHT },
    bannerDetail: { fontSize: 13, color: PaperInk.ACCENT_ON_DARK },
    bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bannerTitle: { fontSize: 16, fontWeight: '600', color: PaperInk.WHITE },
    currentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    flex: { flex: 1 },
    footnote: { flexDirection: 'row', gap: 8, paddingHorizontal: 8 },
    muted: { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED },
    resume: {
        overflow: 'hidden',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: PaperInk.DANGER_SOFT,
        color: PaperInk.DANGER_INK,
        fontWeight: '600',
    },
    stage: { flex: 1, gap: 6 },
    stageLabel: { fontSize: 12, fontWeight: '600', color: PaperInk.TEXT },
    stages: { flexDirection: 'row', gap: 6 },
    strong: { fontSize: 16, fontWeight: '600', color: PaperInk.TEXT },
});
