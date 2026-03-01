import { LayersPlus } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { Status } from './Status';
import { StatusState } from './StatusTypes';

interface StatusBatchWaitingProps {
    queueCount?: number;
    onPressAction?: () => void;
}

export function StatusBatchWaiting({ queueCount, onPressAction }: StatusBatchWaitingProps): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const statusColors = theme.colors.statusBatchWaiting;
    return (
        <Status
            title="Pending"
            subtitle={`${queueCount ?? 0} sessions ready to process.`}
            icon={<LayersPlus size={24} color={statusColors.text} />}
            state={StatusState.BatchWaiting}
        >
            <View style={STYLES.actionRow}>
                <Button
                    mode="contained"
                    buttonColor={statusColors.accent}
                    textColor={theme.colors.onPrimary}
                    icon="play"
                    style={STYLES.actionButton}
                    onPress={onPressAction}
                >
                    Process queue now
                </Button>
            </View>
        </Status>
    );
}

const STYLES = StyleSheet.create({
    actionRow: {
        marginTop: 16,
        alignItems: 'flex-start',
    },
    actionButton: {
        borderRadius: 12,
    },
});
