import type { Meta, StoryObj } from '@storybook/react-native';
import { SubjectSummary } from '../../src/Screen/Model';
import { AnalysisScreen } from '../../src/Screen/Session/AnalysisScreen';
import { ExportSheet } from '../../src/Screen/Session/ExportSheet';
import { PreSessionSheet } from '../../src/Screen/Session/PreSessionSheet';
import { QueueScreen } from '../../src/Screen/Session/QueueScreen';
import { RecordingStage } from '../../src/Screen/Session/RecordingStage';
import { SessionHubScreen } from '../../src/Screen/Session/SessionHubScreen';
import { SessionSavedScreen } from '../../src/Screen/Session/SessionSavedScreen';
import { SessionsHomeScreen } from '../../src/Screen/Session/SessionsHomeScreen';
import { TranscriptScreen } from '../../src/Screen/Session/TranscriptScreen';
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

export const HomeFirstRun: Story = {
    render: () => <SessionsHomeScreen dateLabel="Thursday 5 November" recent={[]} isSetupNeeded />,
};

export const PreSessionChosen: Story = {
    render: () => (
        <PreSessionSheet
            isManual
            subject={SubjectSummary.create('e', 'Subject Elm', 'Last session 6 months ago · 5 sessions', '')}
            lastSummary="Preparing a move, worried about his mother, wishes to space out sessions."
            checks={['Quiet microphone', 'Battery 64 %', '41 GB free']}
            isDoNotDisturb
        />
    ),
};

export const PreSessionByVoice: Story = {
    render: () => <PreSessionSheet isManual={false} checks={['Quiet microphone', 'Battery 64 %', '41 GB free']} isDoNotDisturb />,
};

export const Recording: Story = {
    render: () => <RecordingStage elapsed="42:17" startedAt="10:30" isPaused={false} onStop={() => undefined} />,
};

export const Saved: Story = {
    render: () => <SessionSavedScreen duration="48:17" timeRange="10:30 → 11:18" estimatedMinutes={8} />,
};

export const Queue: Story = {
    render: () => (
        <QueueScreen
            isCharging
            remainingMinutes={25}
            totalCount={3}
            overallProgress={0.22}
            current={StoryFixture.RUNNING}
            next={StoryFixture.NEXT}
        />
    ),
};

export const Hub: Story = {
    render: () => (
        <SessionHubScreen
            subjectName="Subject Lotus"
            rank={12}
            daysSincePrevious={14}
            title="Wednesday 4 Nov."
            time="10:30"
            duration="52 min"
            summary={StoryFixture.SUMMARY}
            note="Revisit the goal set in September."
            lineCount={148}
        />
    ),
};

export const Transcript: Story = {
    render: () => (
        <TranscriptScreen
            subjectName="Subject Lotus"
            rank={12}
            title="Wednesday 4 Nov. · 10:30"
            duration="52 min"
            lines={StoryFixture.LINES}
        />
    ),
};

export const Analysis: Story = {
    render: () => (
        <AnalysisScreen sessionLabel="Tuesday 27 Oct. · 14:00 · 41 min" stages={StoryFixture.ANALYSIS} closestSubject="Subject Willow" />
    ),
};

export const Export: Story = {
    render: () => <ExportSheet isPdf hasTranscript hasSummary hasNotes={false} isMaskingNames />,
};
