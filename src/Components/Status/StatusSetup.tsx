import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {Button, ProgressBar, useTheme} from 'react-native-paper';
import {Wrench} from 'lucide-react-native';
import {Status} from './Status';
import {StatusState} from './StatusTypes';

interface StatusSetupProps {
    modelName?: string;
    downloadProgress?: number;
    downloadSize?: string;
    onPressAction?: () => void;
}

export function StatusSetup({
    modelName,
    downloadProgress,
    downloadSize,
    onPressAction,
}: StatusSetupProps): React.JSX.Element {
    const theme = useTheme();
    const statusColors = (theme.colors as any).statusSetup as {
        background: string;
        text: string;
        accent: string;
        iconBackground: string;
        shadowColor: string;
    };

    return (
        <Status
            title="AI Configuration"
            subtitle={modelName ? `Downloading model ${modelName}...` : undefined}
            icon={<Wrench size={24} color={statusColors.text} />}
            state={StatusState.SETUP}>
            {downloadProgress !== undefined && (
                <View style={styles.progressContainer}>
                    <View style={styles.rowBetween}>
                        <Text style={[styles.progressLabel, {color: statusColors.text}]}>
                            {downloadProgress}%
                        </Text>
                        {downloadSize && (
                            <Text style={[styles.progressLabel, {color: statusColors.text}]}>
                                {downloadSize}
                            </Text>
                        )}
                    </View>
                    <ProgressBar
                        progress={downloadProgress / 100}
                        color={statusColors.accent}
                        style={[
                            styles.progressBar,
                            {backgroundColor: 'rgba(255,255,255, 0.5)'},
                        ]}
                    />
                </View>
            )}
            <View style={styles.actionRow}>
                <Button
                    mode="text"
                    textColor={statusColors.text}
                    compact
                    onPress={onPressAction}>
                    Pause
                </Button>
            </View>
        </Status>
    );
}

const styles = StyleSheet.create({
    progressContainer: {
        marginTop: 8,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        opacity: 0.7,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
    },
    actionRow: {
        marginTop: 16,
        alignItems: 'flex-start',
    },
});
