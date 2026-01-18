import React from 'react';
import {View, StyleSheet} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-native';
import {WaveformBackground} from '../../src/Components';

const meta: Meta<typeof WaveformBackground> = {
    title: 'Components/WaveformBackground',
    component: WaveformBackground,
    decorators: [
        (Story) => (
            <View style={styles.container}>
                <Story />
            </View>
        ),
    ],
};

export default meta;
type WaveformBackgroundStory = StoryObj<typeof WaveformBackground>;

export const Default: WaveformBackgroundStory = {
    args: {},
};

export const CustomColor: WaveformBackgroundStory = {
    args: {
        color: '#C6DEF1',
    },
};

export const PastelMint: WaveformBackgroundStory = {
    args: {
        color: '#C9E4DE',
    },
};

export const PastelLavender: WaveformBackgroundStory = {
    args: {
        color: '#DBCDF0',
    },
};

export const PastelPink: WaveformBackgroundStory = {
    args: {
        color: '#F2C6DE',
    },
};

export const PastelPeach: WaveformBackgroundStory = {
    args: {
        color: '#F7D9C4',
    },
};

export const PastelYellow: WaveformBackgroundStory = {
    args: {
        color: '#FAEDCB',
    },
};

const styles = StyleSheet.create({
    container: {
        width: 300,
        height: 56,
        backgroundColor: '#F7D9C4',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
});
