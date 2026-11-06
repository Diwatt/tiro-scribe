import type { Meta, StoryObj } from '@storybook/react-native';
import { Lock, Share, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
    ButtonKind,
    Notice,
    PillButton,
    ProgressBar,
    SearchField,
    SegmentedControl,
    SlideToConfirm,
    StepProgress,
    Tag,
} from '../../src/Components/Kit';
import { PaperInk } from '../../src/theme/PaperInk';
import { Tone } from '../../src/theme/Tone';

const meta: Meta<typeof PillButton> = {
    title: 'Kit/Controls',
    component: PillButton,
};

export default meta;
type Story = StoryObj<typeof PillButton>;

export const Buttons: Story = {
    render: () => (
        <View style={styles.page}>
            <PillButton label="Create my vault" />
            <PillButton label="Share…" icon={Share} kind={ButtonKind.Outline} />
            <PillButton label="Continue" isDisabled />
            <View style={styles.dark}>
                <PillButton label="Back to sessions" kind={ButtonKind.Light} height={68} />
            </View>
        </View>
    ),
};

export const TagsAndNotices: Story = {
    render: () => (
        <View style={styles.page}>
            <View style={styles.row}>
                <Tag label="On the device" tone={Tone.Accent} icon={Lock} />
                <Tag label="New voice to confirm" tone={Tone.Ochre} />
                <Tag label="Subject Lotus" />
            </View>
            <Notice text="Nobody can reset this password. Without it or your kit, the data is lost." icon={TriangleAlert} />
            <Notice text="Encrypted audio is destroyed as soon as it is transcribed." icon={Lock} tone={Tone.Accent} />
        </View>
    ),
};

function SegmentedDemo(): React.JSX.Element {
    const [index, setIndex] = useState(1);

    return <SegmentedControl label="With whom?" options={['Recognise by voice', 'Choose the subject']} selectedIndex={index} onChange={setIndex} />;
}

export const Inputs: Story = {
    render: () => (
        <ScrollView contentContainerStyle={styles.page}>
            <SegmentedDemo />
            <SearchField placeholder="Search a subject" />
            <StepProgress current={2} total={4} label="Step 2 of 4" />
            <ProgressBar progress={0.38} label="Transcription" />
            <View style={styles.dark}>
                <SlideToConfirm label="Slide to end" onConfirm={() => undefined} />
            </View>
        </ScrollView>
    ),
};

const styles = StyleSheet.create({
    dark: { padding: 16, borderRadius: 24, backgroundColor: PaperInk.NIGHT },
    page: { padding: 16, paddingTop: 64, gap: 16 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
