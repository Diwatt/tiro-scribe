import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { StatusBatchWaiting } from '../../src/Components';

const actionLogger = (name: string) => () => {
    console.log(`[Storybook Action] ${name} pressed`);
};

const meta: Meta<typeof StatusBatchWaiting> = {
    title: 'Components/Status/StatusBatchWaiting',
    component: StatusBatchWaiting,
};

export default meta;
type StatusBatchWaitingStory = StoryObj<typeof StatusBatchWaiting>;

export const BatchWaiting: StatusBatchWaitingStory = {
    args: {
        queueCount: 5,
        onPressAction: actionLogger('Process queue'),
    },
};

export const BatchWaitingLarge: StatusBatchWaitingStory = {
    args: {
        queueCount: 23,
        onPressAction: actionLogger('Process queue'),
    },
};

export const BatchWaitingSingle: StatusBatchWaitingStory = {
    args: {
        queueCount: 1,
        onPressAction: actionLogger('Process queue'),
    },
};
