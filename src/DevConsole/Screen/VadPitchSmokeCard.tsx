import { Circle, CircleCheck, CircleX, LoaderCircle, Play } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { ThemedIcon } from '@/Components';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { SmokeCheck, SmokeCheckStatus } from '../Data/SmokeCheck';

const PlayButtonIcon = ThemedIcon.create({ icon: Play, size: 18, colorToken: 'onPrimary' });

const STATUS_ICONS: Record<SmokeCheckStatus, LucideIcon> = {
    [SmokeCheckStatus.Pending]: Circle,
    [SmokeCheckStatus.Running]: LoaderCircle,
    [SmokeCheckStatus.Passed]: CircleCheck,
    [SmokeCheckStatus.Failed]: CircleX,
};

interface Props {
    readonly voiceWavPath: string;
    readonly isLoading: boolean;
    readonly checks: readonly SmokeCheck[];
    readonly verdict: SmokeCheckStatus;
    readonly error: string | null;
    readonly onWavPathChange: (path: string) => void;
    readonly onRun: () => void;
}

export const VadPitchSmokeCard = ({
    voiceWavPath,
    isLoading,
    checks,
    verdict,
    error,
    onWavPathChange,
    onRun,
}: Props): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();

    const statusColor = (status: SmokeCheckStatus): string => {
        if (status === SmokeCheckStatus.Passed) {
            return theme.colors.primary;
        }
        if (status === SmokeCheckStatus.Failed) {
            return theme.colors.error;
        }

        return theme.colors.onSurfaceVariant;
    };

    const renderCheck = (check: SmokeCheck): React.JSX.Element => {
        const CheckStatusIcon = STATUS_ICONS[check.status];
        const color = statusColor(check.status);

        return (
            <View key={check.id} style={STYLES.checkRow}>
                <CheckStatusIcon color={color} size={18} />
                <View style={STYLES.checkContent}>
                    <View style={STYLES.checkHeader}>
                        <Text variant="bodyMedium" style={{ color }}>
                            {check.label}
                        </Text>
                        <Text variant="labelSmall" style={{ color }}>
                            {check.status.toUpperCase()}
                        </Text>
                    </View>
                    {check.summary.length > 0 && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {check.summary}
                        </Text>
                    )}
                    {check.failureReason != null && (
                        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                            {check.failureReason}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <Card>
            <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    VAD + Pitch Smoke (P3: real bundles via Runtime)
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Loads the real ExecuTorch bundles (download on first run) and checks them on calibrated PCM:
                    TTS speech + pure silence for VAD, 220/440/880 Hz tones + silence for Pitch
                </Text>
                <View style={STYLES.runRow}>
                    <TextInput
                        mode="outlined"
                        label="Voice .wav path (device Documents)"
                        value={voiceWavPath}
                        onChangeText={onWavPathChange}
                        style={STYLES.runInput}
                    />
                    <Button
                        mode="contained"
                        onPress={onRun}
                        loading={isLoading}
                        disabled={isLoading || voiceWavPath.length === 0}
                        icon={PlayButtonIcon}
                        style={STYLES.runInput}
                    >
                        Run
                    </Button>
                </View>
                <View style={STYLES.verdictRow}>
                    <Text variant="titleSmall" style={{ color: statusColor(verdict) }}>
                        Verdict: {verdict.toUpperCase()}
                    </Text>
                </View>
                <View style={STYLES.checkList}>{checks.map(renderCheck)}</View>
                {error != null && (
                    <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                        {error}
                    </Text>
                )}
            </Card.Content>
        </Card>
    );
};

const STYLES = StyleSheet.create({
    checkContent: {
        flex: 1,
        gap: 2,
    },
    checkHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
    },
    checkList: {
        gap: 12,
        marginTop: 8,
    },
    checkRow: {
        flexDirection: 'row',
        gap: 10,
    },
    runInput: {
        flex: 1,
    },
    runRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    verdictRow: {
        marginTop: 4,
    },
});
