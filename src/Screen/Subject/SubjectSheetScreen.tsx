import { MoreHorizontal, Pencil, Sparkles } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
    ButtonKind,
    Disclosure,
    type Fact,
    FactGrid,
    GroupedList,
    ListRow,
    NavigationBar,
    Panel,
    PillButton,
    RoundIconButton,
    ScreenFrame,
    SectionLabel,
} from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { SessionRow } from '@/Screen/Model';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    name: string;
    sessionCount: number;
    facts: ReadonlyArray<Fact>;
    lastAgo: string;
    lastTitle: string;
    lastSummary?: string;
    lastNote?: string;
    previous: ReadonlyArray<SessionRow>;
    onBack?: () => void;
    onMore?: () => void;
    onOpenLast?: () => void;
    onOpenSession?: (id: string) => void;
}

/** Subject sheet: metadata, the last session put forward (summary, note), then earlier sessions. */
export function SubjectSheetScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame>
            <NavigationBar
                backLabel={LL.subjectList.title()}
                onBack={props.onBack}
                trailing={<RoundIconButton icon={MoreHorizontal} label={LL.shell.more()} onPress={props.onMore} />}
            />
            <View style={STYLES.identity}>
                <Text style={STYLES.avatar}>{props.name.trim().split(' ').pop()?.charAt(0)}</Text>
                <View style={STYLES.flex}>
                    <Text style={TypeScale.TITLE} accessibilityRole="header">
                        {props.name}
                    </Text>
                    <Text style={TypeScale.CAPTION}>{LL.subjectSheet.recognised({ count: props.sessionCount })}</Text>
                </View>
            </View>
            <FactGrid facts={props.facts} />
            <Panel isDark>
                <View style={STYLES.lastHead}>
                    <Text style={STYLES.lastLabel}>{LL.subjectSheet.last()}</Text>
                    <Text style={STYLES.lastAgo}>{props.lastAgo}</Text>
                </View>
                <Text style={STYLES.lastTitle}>{props.lastTitle}</Text>
                {props.lastSummary ? (
                    <View style={STYLES.divider}>
                        <Disclosure title={LL.session.summary()} body={props.lastSummary} icon={Sparkles} isDark isInitiallyOpen />
                    </View>
                ) : null}
                {props.lastNote ? (
                    <View style={STYLES.note}>
                        <Pencil size={15} color={PaperInk.OCHRE_ON_DARK} strokeWidth={2.2} />
                        <Text style={STYLES.noteText}>{LL.subjectSheet.yourNote({ note: props.lastNote })}</Text>
                    </View>
                ) : null}
                <PillButton label={LL.subjectSheet.open()} kind={ButtonKind.Light} height={44} onPress={props.onOpenLast} />
            </Panel>
            <SectionLabel label={LL.subjectSheet.previous()} detail={String(props.previous.length)} />
            <GroupedList>
                {props.previous.map((session) => (
                    <ListRow
                        key={session.id}
                        title={session.date}
                        detail={session.excerpt}
                        value={session.meta}
                        isTitleStrong
                        trailing={session.hasNote ? <Pencil size={15} color={PaperInk.OCHRE_INK} strokeWidth={2.2} /> : undefined}
                        onPress={() => props.onOpenSession?.(session.id)}
                    />
                ))}
            </GroupedList>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        backgroundColor: PaperInk.INK,
        color: PaperInk.PAPER,
        fontSize: 21,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 52,
    },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(245,241,234,0.14)', paddingTop: 10 },
    flex: { flex: 1, gap: 2 },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4 },
    lastAgo: { fontSize: 13, color: PaperInk.ON_DARK_MUTED },
    lastHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    lastLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: PaperInk.ACCENT_ON_DARK },
    lastTitle: { fontSize: 19, fontWeight: '700', color: PaperInk.PAPER },
    note: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, backgroundColor: 'rgba(245,241,234,0.08)' },
    noteText: { flex: 1, fontSize: 14, lineHeight: 20, color: PaperInk.NIGHT_TEXT_SOFT },
});
