import { observer } from '@legendapp/state/react';
import type React from 'react';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecureSessionButton, StatusProcessing, StatusReady, WifiRequiredModal } from '@/Components';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { HomeState } from '@/State/HomeState';
import type { ExtendedTheme } from '@/theme/AppTheme';

export const Home = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useLocalization();
    const homeState = Container.get(HomeState);
    const insets = useSafeAreaInsets();

    // Bind to observables
    const executors = homeState.executors.get();
    const isDownloading = executors.isDownloading.get();
    const _progress = executors.progress.get();
    const currentCapability = executors.currentCapability$.get();
    const currentCapabilityProgress = executors.currentCapabilityProgress$.get();
    const currentFileName = executors.currentFileName$.get();
    const currentFileProgress = executors.currentFileProgress$.get();
    const setupModalVisible = homeState.setupModalVisible.get();
    const setupBannerVisible = homeState.setupBannerVisible.get();
    const downloadSizeMB = homeState.downloadSizeMB.get();

    useEffect(() => {
        homeState.ensureSetupComplete();
    }, [homeState]);

    const currentFilePercent = Math.round(currentFileProgress);
    const bannerMessage = isDownloading ? `${currentFilePercent}% - ${currentFileName}` : undefined;

    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={[STYLES.scrollContent, { paddingTop: insets.top }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Setup Required Banner */}
                {setupBannerVisible && !isDownloading && (
                    <Card style={[STYLES.setupBanner, { backgroundColor: theme.colors.statusWarning.background }]}>
                        <Card.Content style={STYLES.setupBannerContent}>
                            <View style={STYLES.setupBannerText}>
                                <Text style={[STYLES.setupBannerTitle, { color: theme.colors.statusWarning.text }]}>
                                    {LL.home.setupBannerTitle()}
                                </Text>
                                <Text style={[STYLES.setupBannerSubtitle, { color: theme.colors.statusWarning.text }]}>
                                    {LL.home.setupBannerSubtitle()}
                                </Text>
                            </View>
                            <Button
                                mode="contained"
                                onPress={() => homeState.presentSetupModal()}
                                buttonColor={theme.colors.statusWarning.accent}
                                textColor={theme.colors.statusWarning.text}
                            >
                                {LL.home.setupButton()}
                            </Button>
                            <Button
                                mode="text"
                                onPress={() => homeState.hideSetupBanner()}
                                textColor={theme.colors.statusWarning.text}
                            >
                                {LL.home.dismissButton()}
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {/* Status Display */}
                {isDownloading ? (
                    <StatusProcessing
                        title={
                            currentCapability ? LL.download.downloading({ capability: currentCapability }) : undefined
                        }
                        progress={Math.round(currentCapabilityProgress)}
                        currentTask={bannerMessage}
                    />
                ) : (
                    <StatusReady />
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Record Button */}
            <View style={STYLES.buttonContainer}>
                <SecureSessionButton
                    onPress={() => homeState.navigateToRecording(true)}
                    isRecording={false}
                    disabled={isDownloading}
                />
            </View>

            {/* Wi-Fi Required Modal */}
            <WifiRequiredModal
                visible={setupModalVisible}
                downloadSizeMB={downloadSizeMB}
                onOpenWifiSettings={() => homeState.openWifiSettings()}
                onDownloadAnyway={() => homeState.proceedWithCellularDownload()}
                onClose={() => homeState.closeSetupModal()}
            />
        </View>
    );
});

const STYLES = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },
    setupBanner: { marginBottom: 16 },
    setupBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    setupBannerText: { flex: 1 },
    setupBannerTitle: { fontSize: 16, fontWeight: '600' },
    setupBannerSubtitle: { fontSize: 12, marginTop: 2 },

    buttonContainer: { position: 'absolute', left: 20, right: 20, bottom: 30, alignItems: 'center' },
});
