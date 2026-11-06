import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GroupedList, LargeTitle, ListRow, ScreenFrame, SearchField, SectionLabel, Tag } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { SubjectSummary } from '@/Screen/Model';
import { SubjectStatus } from '@/Screen/Model';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';

interface Props {
    subjects: ReadonlyArray<SubjectSummary>;
    query?: string;
    onQueryChange?: (query: string) => void;
    onSort?: () => void;
    onOpenSubject?: (id: string) => void;
}

/** Subjects tab: pseudonyms recognised by voice, sorted by last session, with session metadata. */
export function SubjectsListScreen({ subjects, query, onQueryChange, onSort, onOpenSubject }: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame hasTabBar>
            <LargeTitle title={LL.subjectList.title()} subtitle={LL.subjectList.subtitle()} />
            <SearchField placeholder={LL.subjectList.search()} value={query} onChangeText={onQueryChange} />
            <SectionLabel label={LL.subjectList.byLast()} actionLabel={LL.subjectList.sort()} onAction={onSort} />
            {subjects.length === 0 ? (
                <Text style={STYLES.empty}>{LL.subjectList.empty()}</Text>
            ) : (
                <GroupedList>
                    {subjects.map((subject) => (
                        <ListRow
                            key={subject.id}
                            title={subject.name}
                            value={subject.lastSeen}
                            isTitleStrong
                            leading={<Text style={STYLES.avatar}>{subject.getInitial()}</Text>}
                            trailing={
                                <View style={STYLES.meta}>
                                    {subject.hasStatus() ? (
                                        <Tag
                                            label={subject.statusLabel}
                                            tone={subject.status === SubjectStatus.NewVoice ? Tone.Ochre : Tone.Accent}
                                        />
                                    ) : null}
                                </View>
                            }
                            detail={subject.meta}
                            onPress={() => onOpenSubject?.(subject.id)}
                        />
                    ))}
                </GroupedList>
            )}
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        overflow: 'hidden',
        backgroundColor: PaperInk.CHIP,
        color: PaperInk.INK,
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 42,
    },
    empty: { fontSize: 14, lineHeight: 20, color: PaperInk.TEXT_MUTED, paddingHorizontal: 4 },
    meta: { alignItems: 'flex-end' },
});
