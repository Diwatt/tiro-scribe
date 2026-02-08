import { AlertTriangle } from 'lucide-react-native';
import type React from 'react';
import { useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { Status } from './Status';
import { StatusState } from './StatusTypes';

interface StatusWarningProps {
    title?: string;
    message?: string;
}

export function StatusWarning({ title = 'Warning', message }: StatusWarningProps): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const statusColors = theme.colors.statusWarning;
    return <Status title={title} subtitle={message} icon={<AlertTriangle size={24} color={statusColors.text} />} state={StatusState.Warning} />;
}
