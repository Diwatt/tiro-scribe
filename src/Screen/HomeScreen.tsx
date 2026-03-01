import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ProgressBar, useTheme } from 'react-native-paper';
import { SecureSessionButton, StatusReady } from '@/Components';
import { useAppLanguage } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { registry } from '../Database/Registry';
import { Therapist } from '../Entity/Therapist';
import { inferenceManager, useArtifactDownloadProgress } from '../Service/InferenceManager';

export const Home = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const router = useRouter();
    const { LL } = useAppLanguage();
    const { progress, isReady: _isReady, isDownloading } = useArtifactDownloadProgress();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const repo = await registry.getRepository(Therapist);
            const therapists = await repo.findAll();
            if (cancelled) {
                return;
            }
            const current = therapists.first() ?? null;
            inferenceManager.downloadMissingArtifacts(current);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handlePress = () => {
        router.push({ pathname: '/main/recording', params: { autoStart: 'true' } });
    };
    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={STYLES.scrollContent} showsVerticalScrollIndicator={false}>
                {isDownloading && (
                    <Card style={[STYLES.banner, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Card.Content>
                            <Text style={[STYLES.bannerTitle, { color: theme.colors.onSurface }]}>
                                {LL.home.initializingAi()}
                            </Text>
                            <ProgressBar
                                progress={progress}
                                color={theme.colors.primary}
                                style={STYLES.bannerProgress}
                            />
                            <Text style={[STYLES.bannerPercent, { color: theme.colors.onSurfaceVariant }]}>
                                {Math.round(progress * 100)}%
                            </Text>
                        </Card.Content>
                    </Card>
                )}
                <StatusReady />
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={STYLES.buttonContainer}>
                <SecureSessionButton onPress={handlePress} isRecording={false} disabled={isDownloading} />
                {isDownloading && (
                    <Text style={[STYLES.warning, { color: theme.colors.statusWarning.text }]}>
                        {LL.home.processingDelayed()}
                    </Text>
                )}
            </View>
        </View>
    );
});

const STYLES = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    banner: {
        marginBottom: 16,
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    bannerProgress: {
        height: 6,
        borderRadius: 3,
    },
    bannerPercent: {
        fontSize: 12,
        marginTop: 4,
    },
    buttonContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 30,
        alignItems: 'center',
    },
    warning: {
        fontSize: 12,
        marginTop: 8,
    },
});
