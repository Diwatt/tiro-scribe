import type { Meta, StoryObj } from '@storybook/react-native';
import { SubjectSheetScreen } from '../../src/Screen/Subject/SubjectSheetScreen';
import { SubjectsListScreen } from '../../src/Screen/Subject/SubjectsListScreen';
import { StoryFixture } from '../Fixture/StoryFixture';

const meta: Meta<typeof SubjectsListScreen> = {
    title: 'Screen/Subject',
    component: SubjectsListScreen,
};

export default meta;
type Story = StoryObj<typeof SubjectsListScreen>;

export const List: Story = { render: () => <SubjectsListScreen subjects={StoryFixture.SUBJECTS} /> };

export const ListEmpty: Story = { render: () => <SubjectsListScreen subjects={[]} /> };

export const Sheet: Story = {
    render: () => (
        <SubjectSheetScreen
            name="Subject Lotus"
            sessionCount={12}
            facts={StoryFixture.FACTS}
            lastAgo="6 days ago"
            lastTitle="Wednesday 4 Nov. · 52 min"
            lastSummary={StoryFixture.SUMMARY}
            lastNote="revisit the goal set in September."
            previous={StoryFixture.PREVIOUS}
        />
    ),
};
