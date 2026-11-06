import type { Meta, StoryObj } from '@storybook/react-native';
import { IncompatibleScreen } from '../../src/Screen/Start/IncompatibleScreen';
import { LaunchScreen } from '../../src/Screen/Start/LaunchScreen';
import { ModelsStepScreen } from '../../src/Screen/Start/ModelsStepScreen';
import { RecoveryKitStepScreen } from '../../src/Screen/Start/RecoveryKitStepScreen';
import { UnlockScreen } from '../../src/Screen/Start/UnlockScreen';
import { VaultStepScreen } from '../../src/Screen/Start/VaultStepScreen';
import { VoiceStepScreen } from '../../src/Screen/Start/VoiceStepScreen';
import { WelcomeScreen } from '../../src/Screen/Start/WelcomeScreen';
import { CalibrationStatus, LanguageOption } from '../../src/Screen/Model';
import { StoryFixture } from '../Fixture/StoryFixture';

const meta: Meta<typeof LaunchScreen> = {
    title: 'Screen/Start',
    component: LaunchScreen,
};

export default meta;
type Story = StoryObj<typeof LaunchScreen>;

export const Launch: Story = { render: () => <LaunchScreen /> };

export const Incompatible: Story = {
    render: () => (
        <IncompatibleScreen
            requirements={StoryFixture.REQUIREMENTS}
            recommendedDevices={['iPhone 13 or later', 'Pixel 8 or later', 'Galaxy S23 or later']}
        />
    ),
};

export const Unlock: Story = { render: () => <UnlockScreen /> };

export const Welcome: Story = { render: () => <WelcomeScreen /> };

export const VaultStep: Story = {
    render: () => (
        <VaultStepScreen
            step={1}
            total={2}
            languages={[LanguageOption.create('fr', 'French'), LanguageOption.create('en', 'English')]}
            selectedLanguages={['fr']}
            email="practice@example.org"
            password="example-passphrase"
            confirmation="example-passphrase"
            strength={0.75}
            strengthLabel="Medium · add a word to make it strong"
        />
    ),
};

export const RecoveryKitStep: Story = {
    render: () => <RecoveryKitStepScreen step={3} total={3} codeGroups={['XXXX', 'XXXX', 'XXXX', 'XXXX', 'XXXX', 'XXXX']} isStored={false} />,
};

export const ModelsStep: Story = { render: () => <ModelsStepScreen step={3} total={3} downloads={StoryFixture.DOWNLOADS} /> };

export const VoiceStep: Story = { render: () => <VoiceStepScreen step={2} total={2} status={CalibrationStatus.Ready} /> };

export const VoiceStepRecording: Story = {
    render: () => <VoiceStepScreen step={2} total={2} status={CalibrationStatus.Recording} />,
};

export const VoiceStepPermission: Story = {
    render: () => <VoiceStepScreen step={2} total={2} status={CalibrationStatus.NeedsPermission} />,
};
