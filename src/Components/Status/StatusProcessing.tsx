import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ActivityIndicator, ProgressBar, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { Status } from './Status';
import { StatusState } from './StatusTypes';

interface StatusProcessingProps {
    progress?: number;
    currentTask?: string;
    timeEstimate?: string;
}

export function StatusProcessing({ progress, currentTask, timeEstimate }: StatusProcessingProps): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const statusColors = theme.colors.statusProcessing;
    return (
        <Status
            title="Processing..."
            subtitle={currentTask}
            icon={<ActivityIndicator size={20} color={statusColors.accent} />}
            iconBgOverride={statusColors.iconBackground}
            state={StatusState.Processing}
        >
            {Boolean(timeEstimate) && (
                <Text style={[STYLES.timeEstimate, { color: statusColors.text }]}>{timeEstimate}</Text>
            )}
            {progress !== undefined && (
                <ProgressBar
                    progress={progress / 100}
                    color={statusColors.accent}
                    style={[
                        STYLES.progressBar,
                        {
                            marginTop: 16,
                            backgroundColor: 'rgba(255,255,255, 0.5)',
                        },
                    ]}
                />
            )}
        </Status>
    );
}

const STYLES = StyleSheet.create({
    timeEstimate: {
        fontWeight: 'bold',
        fontSize: 12,
        opacity: 0.6,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
    },
});
