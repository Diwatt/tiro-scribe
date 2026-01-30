import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useTheme, ProgressBar, Card } from 'react-native-paper';
import { observer } from '@legendapp/state/react';
import { StatusReady, SecureSessionButton } from '@/Components';
import { RootTabScreenProps } from '@/Navigation/types';
import { registry } from '../Database/Registry';
import { Therapist } from '../Entity/Therapist';
import { modelManager, useModelDownloadProgress } from '../Service/ModelManager';

export const Home = observer(function Home({
    navigation,
}: RootTabScreenProps<'Home'>): React.JSX.Element {
    const theme = useTheme();
    const { progress, isReady, isDownloading } = useModelDownloadProgress();

    useEffect(() => {
        const therapists = registry.getRepository(Therapist).findAll();
        const current = therapists[0] ?? null;
        modelManager.downloadMissingModels(current);
    }, []);

    const handlePress = () => {
        navigation.navigate('Recording', { autoStart: true });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {isDownloading && (
                    <Card style={[styles.banner, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Card.Content>
                            <Text style={[styles.bannerTitle, { color: theme.colors.onSurface }]}>
                                Initializing AI Engine…
                            </Text>
                            <ProgressBar
                                progress={progress}
                                color={theme.colors.primary}
                                style={styles.bannerProgress}
                            />
                            <Text style={[styles.bannerPercent, { color: theme.colors.onSurfaceVariant }]}>
                                {Math.round(progress * 100)}%
                            </Text>
                        </Card.Content>
                    </Card>
                )}
                <StatusReady />
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.buttonContainer}>
                <SecureSessionButton
                    onPress={handlePress}
                    isRecording={false}
                    disabled={isDownloading}
                />
                {isDownloading && (
                    <Text style={[styles.warning, { color: theme.colors.error }]}>
                        Processing will be delayed until models are ready.
                    </Text>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
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