import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {ProgressBar, ActivityIndicator, useTheme} from 'react-native-paper';
import {Status} from './Status';
import {StatusState} from './StatusTypes';

interface StatusProcessingProps {
    progress?: number;
    currentTask?: string;
    timeEstimate?: string;
}

export function StatusProcessing({
    progress,
    currentTask,
    timeEstimate,
}: StatusProcessingProps): React.JSX.Element {
    const theme = useTheme();
    const statusColors = (theme.colors as any).statusProcessing as {
        background: string;
        text: string;
        accent: string;
        iconBackground: string;
        shadowColor: string;
    };
    return (
        <Status
            title="Processing..."
            subtitle={currentTask}
            icon={<ActivityIndicator size={20} color={statusColors.accent} />}
            iconBgOverride={statusColors.iconBackground}
            state={StatusState.PROCESSING}>
            {timeEstimate && (
                <Text style={[styles.timeEstimate, {color: statusColors.text}]}>
                    {timeEstimate}
                </Text>
            )}
            {progress !== undefined && (
                <ProgressBar
                    progress={progress / 100}
                    color={statusColors.accent}
                    style={[
                        styles.progressBar,
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

const styles = StyleSheet.create({
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
