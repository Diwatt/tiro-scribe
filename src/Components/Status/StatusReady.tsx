import React from 'react';
import {SparklesIcon} from 'react-native-heroicons/solid';
import {Status} from './Status';
import {StatusState} from './StatusTypes';
import {useTheme} from 'react-native-paper';

interface StatusReadyProps {}

export function StatusReady({}: StatusReadyProps): React.JSX.Element {
    const theme = useTheme();
    const statusColors = (theme.colors as any).statusIdle as {
        background: string;
        text: string;
        accent: string;
        iconBackground: string;
        shadowColor: string;
    };

    return (
        <Status
            title="Ready"
            subtitle="No pending tasks."
            icon={<SparklesIcon size={24} color={statusColors.text} />}
            state={StatusState.READY}
        />
    );
}
