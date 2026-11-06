import { MessagesSquare } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { ThemedIcon } from '@/Components';
import type { ExtendedTheme } from '@/theme/AppTheme';
import type { Utterance } from '@/Entity';
import type { PipelineTimings } from '@/Pipeline';

const TranscribeButtonIcon = ThemedIcon.create({ icon: MessagesSquare, size: 18, colorToken: 'onPrimary' });

interface Props {
    readonly datPath: string;
    readonly isLoading: boolean;
    readonly utterances: Utterance[];
    readonly elapsedMs: number | null;
    readonly timings: PipelineTimings | null;
    readonly error: string | null;
    readonly onDatPathChange: (path: string) => void;
    readonly onTranscribe: () => void;
}

export const SessionTranscribeCard = ({
    datPath,
    isLoading,
    utterances,
    elapsedMs,
    timings,
    error,
    onDatPathChange,
    onTranscribe,
}: Props): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();

    return (
        <Card>
            <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    Session Transcription (Pull Pipeline)
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Encrypted session (.dat) → native pull decryption → VAD segmentation → Parakeet ASR. Every
                    utterance is listed on the absolute stream clock.
                </Text>
                <TextInput
                    mode="outlined"
                    label=".dat path (device files)"
                    value={datPath}
                    onChangeText={onDatPathChange}
                    style={{ marginBottom: 12 }}
                />
                <Button
                    mode="contained"
                    onPress={onTranscribe}
                    loading={isLoading}
                    disabled={isLoading || datPath.length === 0}
                    icon={TranscribeButtonIcon}
                >
                    Transcribe Session
                </Button>
                {error != null && (
                    <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 8 }}>
                        {error}
                    </Text>
                )}
                {elapsedMs != null && (
                    <Text variant="bodySmall" style={{ marginTop: 8 }}>
                        {utterances.length} utterance(s) in {elapsedMs} ms
                    </Text>
                )}
                {timings != null && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        decrypt {timings.getDecryptMs()} ms · convert {timings.getConvertMs()} ms · vad{' '}
                        {timings.getVadMs()} ms · cut {timings.getCutMs()} ms · asr {timings.getAsrMs()} ms
                    </Text>
                )}
                {utterances.length > 0 && (
                    <View style={STYLES.results}>
                        {utterances.map((utterance) => (
                            <Text key={`${utterance.startTime}-${utterance.endTime}`} variant="bodySmall">
                                [{utterance.startTime}–{utterance.endTime} ms] {utterance.text}
                            </Text>
                        ))}
                    </View>
                )}
            </Card.Content>
        </Card>
    );
};

const STYLES = StyleSheet.create({
    results: {
        gap: 4,
        marginTop: 8,
    },
});
