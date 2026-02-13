import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { GlobalActivityBar } from '../../src/Components/GlobalActivityBar';
import { ActivityStatus } from '../../src/State/GlobalActivityStatus';

const meta: Meta<typeof GlobalActivityBar> = {
    title: 'Components/GlobalActivityBar',
    component: GlobalActivityBar,
    argTypes: {
        status: {
            control: 'select',
            options: [ActivityStatus.Ready, ActivityStatus.Pending, ActivityStatus.Success, ActivityStatus.Warning, ActivityStatus.Error],
        },
        message: { control: 'text' },
    },
};

export default meta;

type GlobalActivityBarStory = StoryObj<typeof GlobalActivityBar>;

/** Bar hidden (off-screen). Use controls or the buttons below to switch state. */
export const Ready: GlobalActivityBarStory = {
    args: {
        status: ActivityStatus.Ready,
    },
};

/** Bar visible with loading spinner and indeterminate progress at bottom. */
export const Pending: GlobalActivityBarStory = {
    args: {
        status: ActivityStatus.Pending,
        message: 'Génération du PDF…',
    },
};

/** Bar visible with success style (green) and check icon. */
export const Success: GlobalActivityBarStory = {
    args: {
        status: ActivityStatus.Success,
        message: 'Kit de secours enregistré',
    },
};

/** Bar visible with warning style (theme statusWarning). */
export const Warning: GlobalActivityBarStory = {
    args: {
        status: ActivityStatus.Warning,
        message: 'Vérifiez votre connexion.',
    },
};

/** Bar visible with error style (theme statusError). */
export const ErrorState: GlobalActivityBarStory = {
    args: {
        status: ActivityStatus.Error,
        message: 'Failed to generate or share recovery kit.',
    },
};

/** Interactive: switch between all states with buttons. */
export const AllStatesInteractive: GlobalActivityBarStory = {
    render: function AllStatesInteractiveRender() {
        const [status, setStatus] = useState<ActivityStatus>(ActivityStatus.Pending);
        const [message, setMessage] = useState('Génération du PDF…');
        return (
            <View style={{ flex: 1, paddingTop: 60 }}>
                <GlobalActivityBar status={status} message={message} />
                <View style={{ gap: 8, padding: 16 }}>
                    <Button
                        mode="outlined"
                        onPress={() => {
                            setStatus(ActivityStatus.Ready);
                        }}
                    >
                        Ready (hide)
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => {
                            setStatus(ActivityStatus.Pending);
                            setMessage('Génération du PDF…');
                        }}
                    >
                        Pending
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => {
                            setStatus(ActivityStatus.Success);
                            setMessage('Kit de secours enregistré');
                        }}
                    >
                        Success
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => {
                            setStatus(ActivityStatus.Warning);
                            setMessage('Vérifiez votre connexion.');
                        }}
                    >
                        Warning
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => {
                            setStatus(ActivityStatus.Error);
                            setMessage('Failed to generate or share recovery kit.');
                        }}
                    >
                        Error
                    </Button>
                </View>
            </View>
        );
    },
};
