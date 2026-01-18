import React from 'react';
import {View, StyleSheet} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-native';
import {StylusWritingAnimation} from '../../src/Components';

const meta: Meta<typeof StylusWritingAnimation> = {
    title: 'Components/StylusWritingAnimation',
    component: StylusWritingAnimation,
    decorators: [
        (Story) => (
            <View style={styles.container}>
                <Story />
            </View>
        ),
    ],
};

export default meta;
type StylusWritingAnimationStory = StoryObj<typeof StylusWritingAnimation>;

export const Default: StylusWritingAnimationStory = {
    args: {},
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
});
