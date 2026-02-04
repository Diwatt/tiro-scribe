import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Button, useTheme} from 'react-native-paper';
import {LayersPlus} from 'lucide-react-native';
import {Status} from './Status';
import {StatusState} from './StatusTypes';

interface StatusBatchWaitingProps {
    queueCount?: number;
    onPressAction?: () => void;
}

export function StatusBatchWaiting({
    queueCount,
    onPressAction,
}: StatusBatchWaitingProps): React.JSX.Element {
    const theme = useTheme();
    const statusColors = (theme.colors as any).statusBatchWaiting as {
        background: string;
        text: string;
        accent: string;
        iconBackground: string;
        shadowColor: string;
    };
    return (
        <Status
            title="Pending"
            subtitle={`${queueCount ?? 0} sessions ready to process.`}
            icon={<LayersPlus size={24} color={statusColors.text} />}
            state={StatusState.BATCH_WAITING}>
            <View style={styles.actionRow}>
                <Button
                    mode="contained"
                    buttonColor={statusColors.accent}
                    textColor={theme.colors.onPrimary}
                    icon="play"
                    style={styles.actionButton}
                    onPress={onPressAction}>
                    Process queue now
                </Button>
            </View>
        </Status>
    );
}

const styles = StyleSheet.create({
    actionRow: {
        marginTop: 16,
        alignItems: 'flex-start',
    },
    actionButton: {
        borderRadius: 12,
    },
});
