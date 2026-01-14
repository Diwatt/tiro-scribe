/**
 * Recording Screen
 * Main screen for audio recording functionality
 */

import React, {useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Surface, useTheme} from 'react-native-paper';
import {RecordButton} from '@/Components';
import {useAudioRecording} from '@Recording/Hook/AudioRecording';
// TODO: Import AudioProcessing when available
// import { AudioProcessing } from '@Service';

/**
 * RecordingScreen Component
 *
 * Displays the recording interface with:
 * - Recording status and information
 * - RecordButton for start/stop actions
 * - Error handling display
 */
export const RecordingScreen: React.FC = () => {
    const theme = useTheme();
    const [isPaused, setIsPaused] = useState(false);

    // TODO: Initialize AudioProcessing when available
    // For now, we'll create a mock implementation
    // const audioProcessingService = useMemo(() => {
    //   return new AudioProcessing(biocodeService, anonymizerService);
    // }, []);

    // Mock implementation until services are available
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // TODO: Replace with actual hook when AudioProcessing is available
    // const { isRecording, isProcessing, error, startRecording, stopRecording } =
    //   useAudioRecording(audioProcessingService);

    const handleRecordPress = async () => {
        try {
            if (isRecording) {
                // Stop recording
                setIsRecording(false);
                setIsProcessing(true);
                // TODO: Implement actual stop recording logic
                // await stopRecording();
                // Simulate processing delay
                setTimeout(() => {
                    setIsProcessing(false);
                }, 1000);
            } else {
                // Start recording
                setError(null);
                setIsRecording(true);
                // TODO: Implement actual start recording logic
                // await startRecording();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Recording failed');
            setIsRecording(false);
        }
    };

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.colors.background},
            ]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>
                <Surface
                    style={[
                        styles.card,
                        {backgroundColor: theme.colors.surface},
                    ]}>
                    <Text variant="headlineMedium" style={styles.title}>
                        Audio Recording
                    </Text>
                    <Text
                        variant="bodyMedium"
                        style={[
                            styles.subtitle,
                            {color: theme.colors.onSurfaceVariant},
                        ]}>
                        Record medical consultations and conversations
                    </Text>
                </Surface>

                <Surface
                    style={[
                        styles.statusCard,
                        {backgroundColor: theme.colors.surface},
                    ]}>
                    <View style={styles.statusRow}>
                        <Text variant="labelLarge" style={styles.statusLabel}>
                            Status:
                        </Text>
                        <Text
                            variant="bodyLarge"
                            style={[
                                styles.statusValue,
                                {
                                    color: isRecording
                                        ? theme.colors.error
                                        : isProcessing
                                          ? theme.colors.tertiary
                                          : theme.colors.primary,
                                },
                            ]}>
                            {isProcessing
                                ? 'Processing...'
                                : isRecording
                                  ? 'Recording'
                                  : 'Ready'}
                        </Text>
                    </View>

                    {error && (
                        <Surface
                            style={[
                                styles.errorCard,
                                {backgroundColor: theme.colors.errorContainer},
                            ]}>
                            <Text
                                variant="bodyMedium"
                                style={{color: theme.colors.onErrorContainer}}>
                                {error}
                            </Text>
                        </Surface>
                    )}
                </Surface>

                <Surface
                    style={[
                        styles.infoCard,
                        {backgroundColor: theme.colors.surfaceVariant},
                    ]}>
                    <Text
                        variant="bodySmall"
                        style={[
                            styles.infoText,
                            {color: theme.colors.onSurfaceVariant},
                        ]}>
                        {isRecording
                            ? 'Recording in progress. Tap the button to stop.'
                            : 'Tap the button below to start recording.'}
                    </Text>
                </Surface>
            </ScrollView>

            <RecordButton
                isRecording={isRecording}
                isPaused={isPaused}
                onPress={handleRecordPress}
                disabled={isProcessing}
                position="bottom-right"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100, // Space for FAB
    },
    card: {
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2,
    },
    title: {
        marginBottom: 8,
        fontWeight: '600',
    },
    subtitle: {
        marginTop: 4,
    },
    statusCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 1,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        opacity: 0.7,
    },
    statusValue: {
        fontWeight: '600',
    },
    errorCard: {
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
    },
    infoCard: {
        padding: 16,
        borderRadius: 12,
        elevation: 0,
    },
    infoText: {
        textAlign: 'center',
        lineHeight: 20,
    },
});
