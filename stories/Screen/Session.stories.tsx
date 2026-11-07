import type { Meta, StoryObj } from '@storybook/react-native';
import { RecordingStage } from '../../src/Screen/Session/RecordingStage';
import { SessionSavedScreen } from '../../src/Screen/Session/SessionSavedScreen';
import { SessionsHomeScreen } from '../../src/Screen/Session/SessionsHomeScreen';
import { StoryFixture } from '../Fixture/StoryFixture';

const meta: Meta<typeof SessionsHomeScreen> = {
    title: 'Screen/Session',
    component: SessionsHomeScreen,
};

export default meta;
type Story = StoryObj<typeof SessionsHomeScreen>;

export const Home: Story = {
    render: () => (
        <SessionsHomeScreen dateLabel="Thursday 5 November" recent={StoryFixture.RECENT} runningPercent={38} waitingCount={2} />
    ),
};

export const HomeEmpty: Story = {
    render: () => <SessionsHomeScreen dateLabel="Thursday 5 November" recent={[]} />,
};

export const HomeFirstRun: Story = {
    render: () => <SessionsHomeScreen dateLabel="Thursday 5 November" recent={[]} isSetupNeeded />,
};

export const Recording: Story = {
    render: () => <RecordingStage elapsed="42:17" startedAt="10:30" isPaused={false} onStop={() => undefined} />,
};

export const Saved: Story = {
    render: () => <SessionSavedScreen duration="48:17" timeRange="10:30 → 11:18" estimatedMinutes={8} />,
};
