import type { Meta, StoryObj } from '@storybook/react-native';
import { LaunchScreen } from '../../src/Screen/Start/LaunchScreen';
import { RecoveryKitStepScreen } from '../../src/Screen/Start/RecoveryKitStepScreen';
import { VaultStepScreen } from '../../src/Screen/Start/VaultStepScreen';
import { VoiceStepScreen } from '../../src/Screen/Start/VoiceStepScreen';
import { WelcomeScreen } from '../../src/Screen/Start/WelcomeScreen';
import { CalibrationStatus, LanguageOption } from '../../src/Screen/Model';

const meta: Meta<typeof LaunchScreen> = {
    title: 'Screen/Start',
    component: LaunchScreen,
};

export default meta;
type Story = StoryObj<typeof LaunchScreen>;

export const Launch: Story = { render: () => <LaunchScreen /> };

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

export const VoiceStep: Story = { render: () => <VoiceStepScreen step={2} total={2} status={CalibrationStatus.Ready} /> };

export const VoiceStepRecording: Story = {
    render: () => <VoiceStepScreen step={2} total={2} status={CalibrationStatus.Recording} />,
};

export const VoiceStepPermission: Story = {
    render: () => <VoiceStepScreen step={2} total={2} status={CalibrationStatus.NeedsPermission} />,
};
