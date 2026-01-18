/**
 * Transcript Detail Screen
 * Chat-like view of the transcription result
 */

import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, useTheme, Surface, Chip, IconButton} from 'react-native-paper';
import {ArrowLeft, Download, Share2} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';

interface TranscriptDetailScreenProps {
    route?: {
        params?: {
            encounterId?: string;
            transcript?: string;
            biocode?: string;
            date?: string;
        };
    };
}

export function TranscriptDetailScreen({
    route,
}: TranscriptDetailScreenProps): React.JSX.Element {
    const theme = useTheme();
    const navigation = useNavigation();

    // Mock data
    const transcript =
        route?.params?.transcript ||
        'Patient reported feeling anxious about upcoming appointment. Discussed coping strategies and scheduled follow-up in two weeks.';

    const biocode = route?.params?.biocode || 'SUBJ-****-A3F2';
    const date = route?.params?.date || '2 hours ago';

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.colors.background},
            ]}>
            <Surface
                style={[
                    styles.header,
                    {backgroundColor: theme.colors.surface},
                ]}>
                <IconButton
                    icon={ArrowLeft}
                    size={24}
                    onPress={() => navigation.goBack()}
                />
                <View style={styles.headerContent}>
                    <Text
                        variant="titleMedium"
                        style={[styles.title, {color: theme.colors.onSurface}]}>
                        Transcript
                    </Text>
                    <View style={styles.headerMeta}>
                        <Chip
                            mode="flat"
                            compact
                            style={styles.chip}>
                            {biocode}
                        </Chip>
                        <Text
                            variant="bodySmall"
                            style={[
                                styles.date,
                                {color: theme.colors.onSurfaceVariant},
                            ]}>
                            {date}
                        </Text>
                    </View>
                </View>
                <IconButton
                    icon={Download}
                    size={24}
                    onPress={() => console.log('Download')}
                />
                <IconButton
                    icon={Share2}
                    size={24}
                    onPress={() => console.log('Share')}
                />
            </Surface>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}>
                <Surface
                    style={[
                        styles.transcriptCard,
                        {backgroundColor: theme.colors.surface},
                    ]}>
                    <Text
                        variant="bodyLarge"
                        style={[styles.transcript, {color: theme.colors.onSurface}]}>
                        {transcript}
                    </Text>
                </Surface>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        elevation: 2,
    },
    headerContent: {
        flex: 1,
        marginLeft: 8,
    },
    title: {
        fontWeight: '600',
        marginBottom: 4,
    },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chip: {
        height: 24,
    },
    date: {
        opacity: 0.7,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    transcriptCard: {
        padding: 20,
        borderRadius: 12,
        elevation: 1,
    },
    transcript: {
        lineHeight: 24,
    },
});
