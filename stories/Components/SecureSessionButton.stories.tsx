import type { Meta, StoryObj } from '@storybook/react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SecureSessionButton } from '../../src/Components';

const actionLogger = (_name: string) => () => {
    /* no-op for story actions */
};

const meta: Meta<typeof SecureSessionButton> = {
    title: 'Components/SecureSessionButton',
    component: SecureSessionButton,
    argTypes: {
        isRecording: {
            control: { type: 'boolean' },
            description: 'Whether the button is in recording state',
        },
        onPress: {
            action: 'pressed',
            description: 'Callback when button is pressed',
        },
    },
    decorators: [
        (Story) => (
            <View style={styles.container}>
                <Story />
            </View>
        ),
    ],
};

export default meta;
type SecureSessionButtonStory = StoryObj<typeof SecureSessionButton>;

export const Idle: SecureSessionButtonStory = {
    args: {
        isRecording: false,
        onPress: actionLogger('Start Secure Session'),
    },
};

export const Recording: SecureSessionButtonStory = {
    args: {
        isRecording: true,
        onPress: actionLogger('Stop Recording'),
    },
};

const InteractiveWrapper = () => {
    const [isRecording, setIsRecording] = useState(false);

    return (
        <View style={styles.interactiveContainer}>
            <SecureSessionButton
                isRecording={isRecording}
                onPress={() => {
                    setIsRecording(!isRecording);
                    actionLogger('Toggle Recording')();
                }}
            />
            <Text style={styles.hint}>Tap the button to see the animation</Text>
        </View>
    );
};

export const Interactive: SecureSessionButtonStory = {
    render: () => <InteractiveWrapper />,
};

const AutoAnimateWrapper = () => {
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsRecording((prev) => !prev);
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.interactiveContainer}>
            <SecureSessionButton isRecording={isRecording} onPress={actionLogger('Button Pressed')} />
            <Text style={styles.hint}>Auto-animating every 2.5 seconds</Text>
        </View>
    );
};

export const AutoAnimate: SecureSessionButtonStory = {
    render: () => <AutoAnimateWrapper />,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
    },
    interactiveContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 16,
    },
    hint: {
        marginTop: 16,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});
