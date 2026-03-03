import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Download, Share2 } from 'lucide-react-native';
import type React from 'react';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useAppLanguage } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';

export function TranscriptDetailScreen(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const router = useRouter();
    const { LL } = useAppLanguage();
    const params = useLocalSearchParams<{
        id?: string;
        transcript?: string;
        biocode?: string;
        date?: string;
    }>();

    // Mock data – id from route, optional query params
    const transcript =
        params.transcript ||
        'Patient reported feeling anxious about upcoming appointment. Discussed coping strategies and scheduled follow-up in two weeks.';

    const biocode = params.biocode
        ? Array.isArray(params.biocode)
            ? JSON.stringify(params.biocode)
            : params.biocode
        : 'SUBJ-****-A3F2';
    const date = params.date || '2 hours ago';

    const handleBackPress = useCallback(() => {
        router.back();
    }, [router]);

    const handleDownloadPress = useCallback(() => {
        /* TODO: implement download */
    }, []);

    const handleSharePress = useCallback(() => {
        /* TODO: implement share */
    }, []);
    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <Surface style={[STYLES.header, { backgroundColor: theme.colors.surface }]}>
                <IconButton icon={ArrowLeft} size={24} onPress={handleBackPress} />
                <View style={STYLES.headerContent}>
                    <Text variant="titleMedium" style={[STYLES.title, { color: theme.colors.onSurface }]}>
                        {LL.transcript.title()}
                    </Text>
                    <View style={STYLES.headerMeta}>
                        <Chip mode="flat" compact style={STYLES.chip}>
                            {biocode}
                        </Chip>
                        <Text variant="bodySmall" style={[STYLES.date, { color: theme.colors.onSurfaceVariant }]}>
                            {date}
                        </Text>
                    </View>
                </View>
                <IconButton icon={Download} size={24} onPress={handleDownloadPress} />
                <IconButton icon={Share2} size={24} onPress={handleSharePress} />
            </Surface>

            <ScrollView style={STYLES.scrollView} contentContainerStyle={STYLES.scrollContent}>
                <Surface style={[STYLES.transcriptCard, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="bodyLarge" style={[STYLES.transcript, { color: theme.colors.onSurface }]}>
                        {transcript}
                    </Text>
                </Surface>
            </ScrollView>
        </View>
    );
}

const STYLES = StyleSheet.create({
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
