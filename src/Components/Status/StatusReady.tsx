import { Sparkles } from 'lucide-react-native';
import type React from 'react';
import { useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { Status } from './Status';
import { StatusState } from './StatusTypes';

type StatusReadyProps = {};

export function StatusReady({}: StatusReadyProps): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const statusColors = theme.colors.statusIdle;
    return <Status title="Ready" subtitle="No pending tasks." icon={<Sparkles size={24} color={statusColors.text} />} state={StatusState.Ready} />;
}
