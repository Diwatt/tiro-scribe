import { Mic } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { ThemedIcon } from '@/Components';
import type { ExtendedTheme } from '@/theme/AppTheme';
import type { SpeechToTextBenchmarkResult } from '../Data/SpeechToTextBenchmarkResult';

const MicButtonIcon = ThemedIcon.create({ icon: Mic, size: 18, colorToken: 'onPrimary' });

interface Props {
    readonly wavPath: string;
    readonly language: string;
    readonly isLoading: boolean;
    readonly error: string | null;
    readonly result: SpeechToTextBenchmarkResult | null;
    readonly onWavPathChange: (path: string) => void;
    readonly onLanguageChange: (language: string) => void;
    readonly onTranscribe: () => void;
}

export const AsrBenchmarkCard = ({
    wavPath,
    language,
    isLoading,
    error,
    result,
    onWavPathChange,
    onLanguageChange,
    onTranscribe,
}: Props): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();

    return (
        <Card style={STYLES.card}>
            <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    ASR Benchmark (P3: pre-packaged whisper-small)
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Decrypt-free smoke test: wav 16 kHz mono → Whisper transcription (model downloaded from the packaged
                    catalog on first run)
                </Text>
                <TextInput
                    mode="outlined"
                    label=".wav path (device Documents)"
                    value={wavPath}
                    onChangeText={onWavPathChange}
                    style={{ marginBottom: 12 }}
                />
                <View style={STYLES.segmentRow}>
                    <TextInput
                        mode="outlined"
                        label="Language"
                        value={language}
                        onChangeText={onLanguageChange}
                        style={STYLES.segmentInput}
                    />
                    <Button
                        mode="contained"
                        onPress={onTranscribe}
                        loading={isLoading}
                        disabled={isLoading || wavPath.length === 0 || language.length === 0}
                        icon={MicButtonIcon}
                        style={STYLES.segmentInput}
                    >
                        Transcribe
                    </Button>
                </View>
                {error != null && (
                    <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                        {error}
                    </Text>
                )}
                {result != null && (
                    <View style={STYLES.benchmarkResults}>
                        <Text variant="bodySmall">
                            Load {result.loadLatencyMs} ms, transcribe {result.latencyMs} ms for{' '}
                            {result.audioDurationMs} ms audio (RTF {result.rtf.toFixed(3)})
                        </Text>
                        <Text variant="bodyMedium">{result.transcript}</Text>
                    </View>
                )}
            </Card.Content>
        </Card>
    );
};

const STYLES = StyleSheet.create({
    card: {
        marginTop: 16,
    },
    benchmarkResults: {
        gap: 4,
        marginTop: 8,
    },
    segmentInput: {
        flex: 1,
    },
    segmentRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
});
