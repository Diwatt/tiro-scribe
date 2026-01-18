import React from 'react';
import type {Meta, StoryObj} from '@storybook/react-native';
import {StatusWarning} from '../../src/Components';

const meta: Meta<typeof StatusWarning> = {
    title: 'Components/Status/StatusWarning',
    component: StatusWarning,
};

export default meta;
type StatusWarningStory = StoryObj<typeof StatusWarning>;

export const Warning: StatusWarningStory = {
    args: {
        title: 'Warning',
        message: 'Please review the following information',
    },
};

export const WarningCustomTitle: StatusWarningStory = {
    args: {
        title: 'Low Battery',
        message: 'Battery level is below 20%. Please charge your device soon.',
    },
};

export const WarningMinimal: StatusWarningStory = {
    args: {
        title: 'Warning',
    },
};

export const WarningDetailed: StatusWarningStory = {
    args: {
        title: 'Storage Space Low',
        message: 'You have less than 1GB of storage space remaining. Some features may not work properly.',
    },
};
