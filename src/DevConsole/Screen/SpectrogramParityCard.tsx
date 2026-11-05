import { Play } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { ThemedIcon } from '@/Components';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { SpectrogramParityVerdict } from '../Data/SpectrogramParityResult';
import type { SpectrogramParityResult } from '../Data/SpectrogramParityResult';

const RunButtonIcon = ThemedIcon.create({ icon: Play, size: 18, colorToken: 'onPrimary' });

interface Props {
    readonly wavPath: string;
    readonly filtersPath: string;
    readonly isLoading: boolean;
    readonly result: SpectrogramParityResult | null;
    readonly error: string | null;
    readonly onWavPathChange: (path: string) => void;
    readonly onFiltersPathChange: (path: string) => void;
    readonly onRun: () => void;
}

export const SpectrogramParityCard = ({
    wavPath,
    filtersPath,
    isLoading,
    result,
    error,
    onWavPathChange,
    onFiltersPathChange,
    onRun,
}: Props): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const verdict = result?.verdict;
    const verdictColor = verdict === SpectrogramParityVerdict.Passed ? theme.colors.primary : theme.colors.error;

    return (
        <Card>
            <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    Front-End Parity (C2: native bridge vs JS oracle)
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Runs the same PCM through the JS log-mel oracle and the native DSP bridge, then compares
                    the feature matrices. A PASS authorizes wiring the models to the native front-end
                </Text>
                <TextInput
                    mode="outlined"
                    label="Voice .wav path (device Documents)"
                    value={wavPath}
                    onChangeText={onWavPathChange}
                    style={STYLES.input}
                />
                <TextInput
                    mode="outlined"
                    label="mel_filters.json path (device Documents)"
                    value={filtersPath}
                    onChangeText={onFiltersPathChange}
                    style={STYLES.input}
                />
                <Button
                    mode="contained"
                    onPress={onRun}
                    loading={isLoading}
                    disabled={isLoading}
                    icon={RunButtonIcon}
                    style={STYLES.runButton}
                >
                    Run parity
                </Button>
                {result != null && (
                    <View style={STYLES.metrics}>
                        <Text variant="bodyMedium" style={{ color: verdictColor }}>
                            Verdict: {verdict?.toUpperCase()}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {`frames js ${result.jsFrameCount} / native ${result.nativeFrameCount}, compared ${result.comparedFrames}`}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {`max |diff| ${result.maxAbsDiff.toExponential(2)}, cosine ${result.cosineSimilarity.toFixed(6)}`}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {`native ${Math.round(result.nativeDurationMs)} ms`}
                        </Text>
                    </View>
                )}
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
    input: {
        marginBottom: 8,
    },
    metrics: {
        gap: 2,
        marginTop: 12,
    },
    runButton: {
        alignSelf: 'flex-start',
    },
});
