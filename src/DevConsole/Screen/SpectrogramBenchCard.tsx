import { Play } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { ThemedIcon } from '@/Components';
import type { ExtendedTheme } from '@/theme/AppTheme';
import type { SpectrogramBenchEntry } from '../Data/SpectrogramBenchEntry';

const RunButtonIcon = ThemedIcon.create({ icon: Play, size: 18, colorToken: 'onPrimary' });

interface Props {
    readonly isLoading: boolean;
    readonly entries: readonly SpectrogramBenchEntry[];
    readonly error: string | null;
    readonly onRun: () => void;
}

export const SpectrogramBenchCard = ({ isLoading, entries, error, onRun }: Props): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();

    const renderEntry = (entry: SpectrogramBenchEntry): React.JSX.Element => (
        <View key={entry.id} style={STYLES.entryRow}>
            <Text variant="bodyMedium">{entry.label}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {`${Math.round(entry.durationMs)} ms for ${entry.audioSeconds.toFixed(1)} s of audio — RTF ${entry.realTimeFactor.toFixed(4)}`}
            </Text>
        </View>
    );

    return (
        <Card>
            <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    Front-End CPU Bench (C2: JS vs native decision)
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Wall-clock cost of the real JS DSP classes on synthesized 16 kHz PCM, per second of audio.
                    Decision rule: if the front-end RTF is small next to the ASR RTF (~0.03), keep JS; if it dominates,
                    move the front-end to native (Swift vDSP + Kotlin)
                </Text>
                <Button
                    mode="contained"
                    onPress={onRun}
                    loading={isLoading}
                    disabled={isLoading}
                    icon={RunButtonIcon}
                    style={STYLES.runButton}
                >
                    Run bench
                </Button>
                {entries.length > 0 && <View style={STYLES.entryList}>{entries.map(renderEntry)}</View>}
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
    entryList: {
        gap: 8,
        marginTop: 12,
    },
    entryRow: {
        gap: 2,
    },
    runButton: {
        alignSelf: 'flex-start',
    },
});
