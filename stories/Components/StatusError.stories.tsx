import React from 'react';
import type {Meta, StoryObj} from '@storybook/react-native';
import {StatusError} from '../../src/Components';

const meta: Meta<typeof StatusError> = {
    title: 'Components/Status/StatusError',
    component: StatusError,
};

export default meta;
type StatusErrorStory = StoryObj<typeof StatusError>;

export const Error: StatusErrorStory = {
    args: {
        title: 'Error',
        message: 'An unexpected error occurred',
    },
};

export const ErrorCustomTitle: StatusErrorStory = {
    args: {
        title: 'Connection Failed',
        message: 'Unable to connect to the server. Please check your internet connection.',
    },
};

export const ErrorMinimal: StatusErrorStory = {
    args: {
        title: 'Error',
    },
};

export const ErrorDetailed: StatusErrorStory = {
    args: {
        title: 'Processing Failed',
        message: 'Failed to process recording. The audio file may be corrupted or in an unsupported format.',
    },
};
