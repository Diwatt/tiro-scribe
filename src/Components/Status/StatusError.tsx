import React from 'react';
import {ExclamationCircleIcon} from 'react-native-heroicons/solid';
import {Status} from './Status';
import {StatusState} from './StatusTypes';
import {useTheme} from 'react-native-paper';

interface StatusErrorProps {
    title?: string;
    message?: string;
}

export function StatusError({
    title = 'Error',
    message,
}: StatusErrorProps): React.JSX.Element {
    const theme = useTheme();
    const statusColors = (theme.colors as any).statusError as {
        bg: string;
        text: string;
        accent: string;
        iconBg: string;
        shadowColor: string;
    };

    return (
        <Status
            title={title}
            subtitle={message}
            icon={<ExclamationCircleIcon size={24} color={statusColors.text} />}
            state={StatusState.ERROR}
        />
    );
}
