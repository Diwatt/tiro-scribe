import React from 'react';
import {ExclamationTriangleIcon} from 'react-native-heroicons/solid';
import {Status} from './Status';
import {StatusState} from './StatusTypes';
import {useTheme} from 'react-native-paper';

interface StatusWarningProps {
    title?: string;
    message?: string;
}

export function StatusWarning({
    title = 'Warning',
    message,
}: StatusWarningProps): React.JSX.Element {
    const theme = useTheme();
    const statusColors = (theme.colors as any).statusWarning as {
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
            icon={<ExclamationTriangleIcon size={24} color={statusColors.text} />}
            state={StatusState.WARNING}
        />
    );
}
