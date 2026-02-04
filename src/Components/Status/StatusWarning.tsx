import React from 'react';
import {AlertTriangle} from 'lucide-react-native';
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
        background: string;
        text: string;
        accent: string;
        iconBackground: string;
        shadowColor: string;
    };
    return (
        <Status
            title={title}
            subtitle={message}
            icon={<AlertTriangle size={24} color={statusColors.text} />}
            state={StatusState.WARNING}
        />
    );
}
