/**
 * Recording Screen
 * Main screen for audio recording functionality
 */

import React, {useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Surface, useTheme} from 'react-native-paper';
import {observer} from '@legendapp/state/react';
import {RecordButton} from '@/Components';
import {useAudioRecording} from '@Recording/useAudioRecording';
import {TiroScribeException} from '@/Exception';

/**
 * RecordingScreen Component
 *
 * Displays the recording interface with:
 * - Recording status and information
 * - RecordButton for start/stop actions
 * - Error handling display
 */
interface RecordingScreenProps {
    // No props needed for this screen
}

export const RecordingScreen = observer((props: RecordingScreenProps): React.JSX.Element => {
    const theme = useTheme();
    const [error, setError] = useState<string | null>(null);

    // Use audio recording store (OOP class with Legend-State observables)
    const audioRecording = useAudioRecording();

    const handleRecordPress = async () => {
        setError(null);
        try {
            if (audioRecording.isRecording) {
                // Stop recording
                await audioRecording.stopRecording();
            } else {
                // Start recording
                await audioRecording.startRecording();
            }
        } catch (err) {
            const errorMessage =
                err instanceof TiroScribeException
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : 'An unexpected error occurred';
            setError(errorMessage);
            console.error('Recording error:', err);
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
                                    color: audioRecording.isRecording
                                        ? theme.colors.error
                                        : theme.colors.primary,
                                },
                            ]}>
                            {audioRecording.isRecording ? 'Recording' : 'Ready'}
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
                        {audioRecording.isRecording
                            ? 'Recording in progress. Tap the button to stop.'
                            : 'Tap the button below to start recording.'}
                    </Text>
                </Surface>
            </ScrollView>

            <RecordButton
                isRecording={audioRecording.isRecording}
                onPress={handleRecordPress}
                disabled={false}
                position="bottom-right"
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
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
