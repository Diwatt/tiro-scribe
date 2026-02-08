import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { StatusProcessing } from '../../src/Components';

const meta: Meta<typeof StatusProcessing> = {
    title: 'Components/Status/StatusProcessing',
    component: StatusProcessing,
};

export default meta;
type StatusProcessingStory = StoryObj<typeof StatusProcessing>;

export const Processing: StatusProcessingStory = {
    args: {
        progress: 65,
        currentTask: 'Anonymizing subject B7C1',
        timeEstimate: '~2 min',
    },
};

export const ProcessingStarted: StatusProcessingStory = {
    args: {
        progress: 5,
        currentTask: 'Initializing transcription',
        timeEstimate: '~5 min',
    },
};

export const ProcessingAlmostDone: StatusProcessingStory = {
    args: {
        progress: 95,
        currentTask: 'Finalizing anonymization',
        timeEstimate: '~30 sec',
    },
};
