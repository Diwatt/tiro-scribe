import { Lock, Plug, TriangleAlert } from 'lucide-react-native';
import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GroupedList, IconTile, LargeTitle, ListRow, Panel, ProgressBar, ScreenFrame, SectionLabel, Tag } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { SessionPreview } from '@/Screen/Model';
import { Metric } from '@/theme/Metric';
import { FirstSessionGuide } from './FirstSessionGuide';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';

interface Props {
    dateLabel: string;
    recent: ReadonlyArray<SessionPreview>;
    runningPercent?: number;
    waitingCount?: number;
    isSetupNeeded?: boolean;
    downloadLabel?: string;
    downloadProgress?: number;
    isRecordDisabled?: boolean;
    onRecord?: () => void;
    onSetup?: () => void;
    onOpenQueue?: () => void;
    onOpenSession?: (id: string) => void;
}

/** Sessions tab: start a session, see what waits for transcription, reopen recent sessions. */
export function SessionsHomeScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const hasQueue = props.runningPercent !== undefined || (props.waitingCount ?? 0) > 0;

    return (
        <ScreenFrame hasTabBar>
            <LargeTitle
                overline={props.dateLabel}
                title={LL.homeScreen.title()}
                trailing={<Tag label={LL.homeScreen.onDevice()} tone={Tone.Accent} icon={Lock} />}
            />
            {props.isSetupNeeded ? (
                <Panel>
                    <View style={STYLES.setup}>
                        <IconTile icon={TriangleAlert} tone={Tone.Ochre} size={40} />
                        <View style={STYLES.flex}>
                            <Text style={STYLES.strong}>{LL.homeScreen.setupTitle()}</Text>
                            <Text style={STYLES.muted}>{LL.homeScreen.setupBody()}</Text>
                        </View>
                        <Text style={STYLES.link} onPress={props.onSetup} accessibilityRole="button">
                            {LL.homeScreen.setupAction()}
                        </Text>
                    </View>
                </Panel>
            ) : null}
            {props.downloadLabel !== undefined ? (
                <Panel>
                    <Text style={STYLES.strong}>{props.downloadLabel}</Text>
                    <ProgressBar progress={props.downloadProgress ?? 0} label={props.downloadLabel} />
                </Panel>
            ) : null}
            <Pressable
                onPress={props.onRecord}
                disabled={props.isRecordDisabled}
                accessibilityRole="button"
                accessibilityLabel={LL.homeScreen.start()}
                style={({ pressed }) => [
                    STYLES.hero,
                    pressed && STYLES.heroPressed,
                    props.isRecordDisabled && STYLES.dimmed,
                ]}
            >
                {({ pressed }) => (
                    <>
                        <View style={[STYLES.recordOuter, pressed && STYLES.recordOuterPressed]}>
                            <View style={[STYLES.recordDot, pressed && STYLES.recordDotPressed]} />
                        </View>
                        <View style={STYLES.flex}>
                            <Text style={STYLES.heroTitle}>{LL.homeScreen.start()}</Text>
                            <Text style={STYLES.heroDetail}>{LL.homeScreen.startDetail()}</Text>
                        </View>
                    </>
                )}
            </Pressable>
            {hasQueue ? (
                <>
                    <SectionLabel
                        label={LL.homeScreen.toTranscribe()}
                        actionLabel={LL.homeScreen.seeAll()}
                        onAction={props.onOpenQueue}
                    />
                    <GroupedList>
                        {props.runningPercent !== undefined ? (
                            <ListRow
                                title={LL.homeScreen.running({ percent: props.runningPercent })}
                                leading={<IconTile icon={Plug} tone={Tone.Accent} />}
                                onPress={props.onOpenQueue}
                            />
                        ) : null}
                        {(props.waitingCount ?? 0) > 0 ? (
                            <ListRow
                                title={LL.homeScreen.waiting({ count: props.waitingCount })}
                                detail={LL.homeScreen.nextCharge()}
                                leading={<IconTile icon={Plug} tone={Tone.Ochre} />}
                                onPress={props.onOpenQueue}
                            />
                        ) : null}
                    </GroupedList>
                </>
            ) : null}
            {props.recent.length === 0 ? (
                hasQueue ? null : <FirstSessionGuide />
            ) : (
                <>
                    <SectionLabel label={LL.homeScreen.recent()} />
                    <GroupedList>
                        {props.recent.map((session) => (
                            <ListRow
                                key={session.id}
                                title={session.subjectName}
                                detail={session.excerpt}
                                value={session.when}
                                isTitleStrong
                                leading={<Text style={STYLES.avatar}>{session.getInitial()}</Text>}
                                onPress={() => props.onOpenSession?.(session.id)}
                            />
                        ))}
                    </GroupedList>
                </>
            )}
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: PaperInk.CHIP,
        color: PaperInk.INK,
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 40,
    },
    dimmed: { opacity: 0.6 },
    flex: { flex: 1, gap: 4 },
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        padding: 22,
        borderRadius: Metric.RADIUS_HERO,
        backgroundColor: PaperInk.INK,
        shadowColor: PaperInk.INK,
        shadowOpacity: 0.28,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 14 },
        elevation: 6,
    },
    heroPressed: { backgroundColor: PaperInk.INK_PRESSED, transform: [{ scale: 0.98 }], shadowOpacity: 0.16 },
    heroDetail: { fontSize: 13, lineHeight: 18, color: PaperInk.NIGHT_TEXT_SOFT },
    heroTitle: { fontSize: 21, fontWeight: '700', color: PaperInk.WHITE },
    link: { fontSize: 15, fontWeight: '600', color: PaperInk.ACCENT },
    muted: { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED },
    recordDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: PaperInk.RECORD },
    recordDotPressed: { width: 34, height: 34, borderRadius: 17 },
    recordOuterPressed: { borderColor: 'rgba(224,80,62,0.45)' },
    recordOuter: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: PaperInk.CARD,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 6,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    setup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    strong: { fontSize: 15, fontWeight: '600', color: PaperInk.TEXT },
});
