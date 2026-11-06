import { Search, Share } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationBar, RoundIconButton, ScreenFrame, Speaker, Tag, TranscriptEntry } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { TranscriptLine } from '@/Screen/Model';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    subjectName: string;
    rank: number;
    title: string;
    duration: string;
    lines: ReadonlyArray<TranscriptLine>;
    onBack?: () => void;
    onSearch?: () => void;
    onExport?: () => void;
}

/** Transcript as a conversation: subject on the left, therapist on the right. */
export function TranscriptScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame>
            <NavigationBar
                backLabel={LL.homeScreen.title()}
                onBack={props.onBack}
                trailing={
                    <>
                        <RoundIconButton icon={Search} label={LL.shell.search()} onPress={props.onSearch} />
                        <RoundIconButton icon={Share} label={LL.shell.export()} onPress={props.onExport} />
                    </>
                }
            />
            <View style={STYLES.heading}>
                <View style={STYLES.tags}>
                    <Tag label={props.subjectName} />
                    <Text style={TypeScale.CAPTION}>{LL.session.nth({ rank: props.rank })}</Text>
                </View>
                <Text style={TypeScale.TITLE} accessibilityRole="header">
                    {props.title}
                </Text>
                <Text style={TypeScale.CAPTION}>{LL.session.meta({ duration: props.duration })}</Text>
            </View>
            <View style={STYLES.lines}>
                {props.lines.map((line, index) => (
                    <TranscriptEntry
                        key={`${line.time}-${index}`}
                        speaker={line.speaker}
                        speakerLabel={line.speaker === Speaker.Therapist ? LL.session.you() : LL.session.subject()}
                        text={line.text}
                        time={line.time}
                        isFirstOfGroup={TranscriptLine.isFirstOfGroup(props.lines, index)}
                        isLastOfGroup={TranscriptLine.isLastOfGroup(props.lines, index)}
                    />
                ))}
            </View>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    heading: { gap: 5, paddingHorizontal: 4 },
    lines: { gap: 0, paddingTop: 4 },
    tags: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
