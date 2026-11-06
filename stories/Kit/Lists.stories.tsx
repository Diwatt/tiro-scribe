import type { Meta, StoryObj } from '@storybook/react-native';
import { Database, Lock, Sparkles } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import {
    Disclosure,
    FactGrid,
    GroupedList,
    IconTile,
    ListRow,
    Panel,
    SectionLabel,
    SwitchRow,
    TranscriptEntry,
} from '../../src/Components/Kit';
import { Speaker } from '../../src/Components/Kit';
import { TranscriptLine } from '../../src/Screen/Model';
import { Tone } from '../../src/theme/Tone';
import { StoryFixture } from '../Fixture/StoryFixture';

const meta: Meta<typeof GroupedList> = {
    title: 'Kit/Lists',
    component: GroupedList,
};

export default meta;
type Story = StoryObj<typeof GroupedList>;

export const Grouped: Story = {
    render: () => (
        <ScrollView contentContainerStyle={styles.page}>
            <SectionLabel label="Encrypted vault" />
            <GroupedList>
                <ListRow title="Security" value="Face ID" leading={<IconTile icon={Lock} />} onPress={() => undefined} />
                <ListRow title="Models and storage" value="1.2 GB" leading={<IconTile icon={Database} tone={Tone.Accent} />} onPress={() => undefined} />
                <SwitchRow title="Notify when ready" detail="Notification without session content" isOn />
            </GroupedList>
            <FactGrid facts={StoryFixture.FACTS} />
            <Panel>
                <Disclosure title="Mini summary" body={StoryFixture.SUMMARY} icon={Sparkles} isInitiallyOpen />
            </Panel>
        </ScrollView>
    ),
};

export const Conversation: Story = {
    render: () => (
        <ScrollView contentContainerStyle={styles.page}>
            {StoryFixture.LINES.map((line, index) => (
                <TranscriptEntry
                    key={line.time}
                    speaker={line.speaker}
                    speakerLabel={line.speaker === Speaker.Therapist ? 'You' : 'Subject'}
                    text={line.text}
                    time={line.time}
                    isFirstOfGroup={TranscriptLine.isFirstOfGroup(StoryFixture.LINES, index)}
                    isLastOfGroup={TranscriptLine.isLastOfGroup(StoryFixture.LINES, index)}
                />
            ))}
        </ScrollView>
    ),
};

const styles = StyleSheet.create({
    page: { padding: 16, paddingTop: 64, gap: 12 },
});
