import type { Meta, StoryObj } from '@storybook/react-native';
import { StatusBatchWaiting } from '../../src/Components';

const actionLogger = (_name: string) => () => {
    /* no-op for story actions */
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
