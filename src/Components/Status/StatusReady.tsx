import { Sparkles } from 'lucide-react-native';
import type React from 'react';
import { useTheme } from 'react-native-paper';
import { useAppLanguage } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { Status } from './Status';
import { StatusState } from './StatusTypes';

export function StatusReady(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    const statusColors = theme.colors.statusIdle;
    return (
        <Status
            title={LL.statusReadyTitle()}
            subtitle={LL.statusReadySubtitle()}
            icon={<Sparkles size={24} color={statusColors.text} />}
            state={StatusState.Ready}
        />
    );
}
