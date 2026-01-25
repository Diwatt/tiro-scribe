import React from 'react';
import {View, StyleSheet, ScrollView, Text} from 'react-native';
import {useTheme} from 'react-native-paper';
import {useAudioRecording} from '@Recording/useAudioRecording';
import {StatusReady, SecureSessionButton} from '@/Components';
import {FileText} from 'lucide-react-native';

/**
 * Home — recording only at app load.
 * Transcript, Biocode, NER will be added later; queue and DB stay out of the startup path.
 */
export function Home(): React.JSX.Element {
    const theme = useTheme();
    const audioRecording = useAudioRecording();

    const handleStartSession = async () => {
        try {
            if (audioRecording.isRecording) {
                await audioRecording.stopRecording();
            } else {
                await audioRecording.startRecording();
            }
        } catch (error) {
            console.error('Recording error:', error);
        }
    };

    return (
        <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {audioRecording.isRecording ? (
                    <View style={[styles.recordingBanner, {backgroundColor: theme.colors.surface}]}>
                        <Text style={[styles.recordingText, {color: theme.colors.primary}]}>
                            Recording…
                        </Text>
                    </View>
                ) : (
                    <StatusReady />
                )}

                <View style={styles.listContainer}>
                    <View style={styles.emptyState}>
                        <FileText size={48} color={theme.colors.outlineVariant} />
                        <Text style={[styles.emptyText, {color: theme.colors.onSurfaceVariant}]}>
                            No sessions yet
                        </Text>
                        <Text style={[styles.emptyHint, {color: theme.colors.outlineVariant}]}>
                            Transcript, Biocode and NER will appear later
                        </Text>
                    </View>
                </View>

                <View style={{height: 100}} />
            </ScrollView>

            <View style={styles.buttonContainer}>
                <SecureSessionButton
                    isRecording={audioRecording.isRecording}
                    onPress={handleStartSession}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    recordingBanner: {
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    recordingText: {
        fontSize: 16,
        fontWeight: '600',
    },
    listContainer: {
        gap: 12,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        opacity: 0.7,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    },
    emptyHint: {
        marginTop: 8,
        fontSize: 13,
    },
    buttonContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 30,
        alignItems: 'center',
    },
});
