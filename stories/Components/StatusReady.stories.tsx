import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { StatusReady } from '../../src/Components';

const meta: Meta<typeof StatusReady> = {
    title: 'Components/Status/StatusReady',
    component: StatusReady,
};

export default meta;
type StatusReadyStory = StoryObj<typeof StatusReady>;

export const Ready: StatusReadyStory = {
    args: {},
};
