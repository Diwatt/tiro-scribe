import { AlertCircle } from 'lucide-react-native';
import type React from 'react';
import { useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { Status } from './Status';
import { StatusState } from './StatusTypes';

interface StatusErrorProps {
    title?: string;
    message?: string;
}

export function StatusError({ title = 'Error', message }: StatusErrorProps): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const statusColors = theme.colors.statusError;
    return <Status title={title} subtitle={message} icon={<AlertCircle size={24} color={statusColors.text} />} state={StatusState.Error} />;
}
