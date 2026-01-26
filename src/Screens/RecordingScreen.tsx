/**
 * Recording Screen
 * Main screen for audio recording functionality
 * Full-screen modal for secure recording sessions
 */

import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, SafeAreaView} from 'react-native';
import {Text, Surface, useTheme} from 'react-native-paper';
import {observer} from '@legendapp/state/react';
import {SecureTranscribeButton} from '@/Components';
import {useAudioRecording} from '@Service/AudioRecording';
import {TiroScribeException} from '@/Exception';
import {RootStackScreenProps} from '@/Navigation/types';
import {AppLogger} from '@/Util/Logger';

const logger = AppLogger.getInstance();

export const RecordingScreen = observer(function RecordingScreen({
    route,
    navigation,
}: RootStackScreenProps<'Recording'>): React.JSX.Element {
    const theme = useTheme();
    const [error, setError] = useState<string | null>(null);
    const {autoStart} = route.params;

    // Use audio recording store (OOP class with Legend-State observables)
    const audioRecording = useAudioRecording();

    // Auto-start recording if autoStart is true
    useEffect(() => {
        if (autoStart && !audioRecording.isRecording) {
            logger.debug('🚀 [RecordingScreen] Auto-starting recording', {autoStart});
            handleRecordPress();
        }
    }, [autoStart]);

    const handleRecordPress = async () => {
        setError(null);
        try {
            if (audioRecording.isRecording) {
                // Stop recording
                logger.debug('⏹️ [RecordingScreen] Stop recording requested');
                await audioRecording.stopRecording();
                // Navigate back to Home after stopping
                navigation.goBack();
            } else {
                // Start recording
                logger.debug('▶️ [RecordingScreen] Start recording requested');
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
            logger.error('❌ [RecordingScreen] Recording error:', {
                error: err,
                errorMessage,
            });
        }
    };

    return (
        <SafeAreaView
            style={[styles.container, {backgroundColor: theme.colors.background}]}
            edges={['top', 'bottom']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>
                <Surface
                    style={[
                        styles.card,
                        {backgroundColor: theme.colors.surface},
                    ]}>
                    <Text variant="headlineMedium" style={styles.title}>
                        Secure Recording
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
                                        : (theme.colors as any).actions.critical.background,
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

            <View style={styles.buttonContainer}>
                <SecureTranscribeButton
                    onPress={handleRecordPress}
                    isRecording={audioRecording.isRecording}
                />
            </View>
        </SafeAreaView>
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
    buttonContainer: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
