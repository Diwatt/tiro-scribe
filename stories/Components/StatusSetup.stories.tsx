import React from 'react';
import type {Meta, StoryObj} from '@storybook/react-native';
import {StatusSetup} from '../../src/Components';

const actionLogger = (name: string) => () => {
    console.log(`[Storybook Action] ${name} pressed`);
};

const meta: Meta<typeof StatusSetup> = {
    title: 'Components/Status/StatusSetup',
    component: StatusSetup,
};

export default meta;
type StatusSetupStory = StoryObj<typeof StatusSetup>;

export const SetupStarted: StatusSetupStory = {
    args: {
        modelName: 'Whisper Turbo (EN)',
        downloadProgress: 5,
        downloadSize: '~450 MB',
        onPressAction: actionLogger('Pause'),
    },
};

export const SetupDownloading: StatusSetupStory = {
    args: {
        modelName: 'Whisper Turbo (EN)',
        downloadProgress: 45,
        downloadSize: '~450 MB',
        onPressAction: actionLogger('Pause'),
    },
};

export const SetupAlmostDone: StatusSetupStory = {
    args: {
        modelName: 'Whisper Turbo (EN)',
        downloadProgress: 98,
        downloadSize: '~450 MB',
        onPressAction: actionLogger('Pause'),
    },
};

export const SetupDifferentModel: StatusSetupStory = {
    args: {
        modelName: 'Whisper Large (FR)',
        downloadProgress: 67,
        downloadSize: '~1.5 GB',
        onPressAction: actionLogger('Pause'),
    },
};
