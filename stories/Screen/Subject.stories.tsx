import type { Meta, StoryObj } from '@storybook/react-native';
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
