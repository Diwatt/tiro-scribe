import { observer } from '@legendapp/state/react';
import type React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ProgressBar, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecureSessionButton, StatusProcessing, StatusState } from '@/Components';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { HomeState } from '@/State/HomeState';

import { Status } from '@/Components/Status/Status';
import { Sparkles } from 'lucide-react-native';
import type { ExtendedTheme } from '@/theme/AppTheme';

export const Home = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useLocalization();
    const homeState = Container.get(HomeState);
    const isDownloading = homeState.isDownloading.get();
    const progress = homeState.progress.get();
    const bannerMessage = homeState.bannerMessage.get();
    const insets = useSafeAreaInsets();

    // Repository warm-up / one-off read removed.
    // Home-specific initialization should be performed by HomeState or services.

    const handlePress = () => {
        homeState.navigateToRecording(true);
    };
    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={[STYLES.scrollContent, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
                {!!isDownloading && (
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
                {isDownloading ? (
                    <StatusProcessing progress={Math.round(progress * 100)} currentTask={bannerMessage ?? undefined} />
                ) : (
                    <Status
                        title={LL.status.readyTitle()}
                        subtitle={LL.status.readySubtitle()}
                        icon={<Sparkles size={24} color={theme.colors.statusIdle.text} />}
                        state={StatusState.Ready}
                    />
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={STYLES.buttonContainer}>
                <SecureSessionButton onPress={handlePress} isRecording={false} disabled={isDownloading} />
                {!!isDownloading && (
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
