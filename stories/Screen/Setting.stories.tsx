import type { Meta, StoryObj } from '@storybook/react-native';
import { SettingsHomeScreen } from '../../src/Screen/Setting/SettingsHomeScreen';

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
