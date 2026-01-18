import type {StorybookConfig} from '@storybook/react-native';

const main: StorybookConfig = {
    stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
    addons: [
        '@storybook/addon-ondevice-controls',
        '@storybook/addon-ondevice-actions',
        '@storybook/addon-ondevice-notes',
    ],
};

export default main;
