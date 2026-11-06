import type { Meta, StoryObj } from '@storybook/react-native';
import { ProcessingPageScreen } from '../../src/Screen/Setting/ProcessingPageScreen';
import { ProfilePageScreen } from '../../src/Screen/Setting/ProfilePageScreen';
import { SecurityPageScreen } from '../../src/Screen/Setting/SecurityPageScreen';
import { SettingsHomeScreen } from '../../src/Screen/Setting/SettingsHomeScreen';
import { StoragePageScreen } from '../../src/Screen/Setting/StoragePageScreen';
import { TranscriptionTiming } from '../../src/Screen/Setting/TranscriptionTiming';
import { StoryFixture } from '../Fixture/StoryFixture';

const meta: Meta<typeof SettingsHomeScreen> = {
    title: 'Screen/Setting',
    component: SettingsHomeScreen,
};

export default meta;
type Story = StoryObj<typeof SettingsHomeScreen>;

export const Home: Story = {
    render: () => (
        <SettingsHomeScreen
            initials="CM"
            profileDetail="French · practice@example.org"
            securityValue="Face ID"
            storageValue="1.2 GB"
            processingValue="While charging"
            version="0.1"
        />
    ),
};

export const Profile: Story = { render: () => <ProfilePageScreen languages="French" email="practice@example.org" /> };

export const Security: Story = {
    render: () => <SecurityPageScreen isBiometricOn autoLockLabel="After 1 min" isKitSaved />,
};

export const Storage: Story = {
    render: () => (
        <StoragePageScreen
            totalLabel="1.2 GB"
            shares={StoryFixture.SHARES}
            language="French"
            transcriptionModel="Parakeet v3"
            transcriptionSize="640 MB"
            summaryModel="[MODEL TO CHOOSE]"
            summarySize="[SIZE]"
            voiceModels="Silero VAD · CAM++"
            voiceSize="[SIZE]"
        />
    ),
};

export const Processing: Story = {
    render: () => <ProcessingPageScreen timing={TranscriptionTiming.Charging} isSummaryPrepared={false} isNotifying />,
};
