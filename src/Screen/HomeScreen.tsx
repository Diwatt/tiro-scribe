import { observer } from '@legendapp/state/react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react-native';
import type React from 'react';
import { useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ProgressBar, Surface, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecureSessionButton, StatusProcessing, StatusReady } from '@/Components';
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
    const isDownloading = homeState.executors.isDownloading.get();
    const progress = homeState.executors.progress.get();
    const setupModalVisible = homeState.setupModalVisible.get();
    const setupBannerVisible = homeState.setupBannerVisible.get();
    const downloadSizeMB = homeState.downloadSizeMB.get();
    const isWifiConnected = homeState.isWifiConnected.get();
    const showCellularWarning = homeState.showCellularWarning.get();

    useEffect(() => {
        homeState.ensureSetupComplete();
    }, [homeState]);

    const progressPercent = Math.round(progress * 100);
    const bannerMessage = isDownloading ? `Downloading... ${progressPercent}%` : undefined;

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
                                    Setup incomplete
                                </Text>
                                <Text style={[STYLES.setupBannerSubtitle, { color: theme.colors.statusWarning.text }]}>
                                    Transcription unavailable
                                </Text>
                            </View>
                            <Button
                                mode="contained"
                                onPress={() => homeState.presentSetupModal()}
                                buttonColor={theme.colors.statusWarning.accent}
                                textColor={theme.colors.statusWarning.text}
                            >
                                Setup
                            </Button>
                            <Button
                                mode="text"
                                onPress={() => homeState.hideSetupBanner()}
                                textColor={theme.colors.statusWarning.text}
                            >
                                Dismiss
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {/* Download Progress Banner */}
                {isDownloading && (
                    <Card style={[STYLES.progressBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
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
                                {progressPercent}%
                            </Text>
                        </Card.Content>
                    </Card>
                )}

                {/* Status Display */}
                {isDownloading ? (
                    <StatusProcessing progress={progressPercent} currentTask={bannerMessage} />
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

            {/* Setup Modal */}
            <Modal visible={setupModalVisible} animationType="slide" transparent>
                <View style={STYLES.modalOverlay}>
                    <Surface style={[STYLES.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <View style={STYLES.modalHeader}>
                            <AlertTriangle size={32} color={theme.colors.primary} />
                            <Text style={[STYLES.modalTitle, { color: theme.colors.onSurface }]}>
                                Important: Large Files Download
                            </Text>
                        </View>

                        <View style={STYLES.modalBody}>
                            <Text style={[STYLES.modalText, { color: theme.colors.onSurfaceVariant }]}>
                                The app needs to download approximately{' '}
                                <Text style={STYLES.bold}>{downloadSizeMB} MB</Text> of AI models to work offline.
                            </Text>

                            <Text style={[STYLES.modalText, { color: theme.colors.onSurfaceVariant }]}>
                                This includes models for transcription and voice activity detection.
                            </Text>

                            <View style={[STYLES.wifiStatus, { backgroundColor: theme.colors.surfaceVariant }]}>
                                {isWifiConnected === true ? (
                                    <>
                                        <Wifi size={20} color={theme.colors.statusIdle.accent} />
                                        <Text style={[STYLES.wifiText, { color: theme.colors.statusIdle.text }]}>
                                            Wi-Fi Connected
                                        </Text>
                                    </>
                                ) : isWifiConnected === false ? (
                                    <>
                                        <WifiOff size={20} color={theme.colors.statusWarning.text} />
                                        <Text style={[STYLES.wifiText, { color: theme.colors.statusWarning.text }]}>
                                            Cellular Network
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={[STYLES.wifiText, { color: theme.colors.onSurfaceVariant }]}>
                                        Checking network...
                                    </Text>
                                )}
                            </View>

                            {showCellularWarning && (
                                <View
                                    style={[
                                        STYLES.cellularWarning,
                                        { backgroundColor: theme.colors.statusWarning.background },
                                    ]}
                                >
                                    <Text style={[STYLES.cellularText, { color: theme.colors.statusWarning.text }]}>
                                        You are currently on a cellular network. Downloading these files may consume a
                                        large amount of data.
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={STYLES.modalActions}>
                            {showCellularWarning ? (
                                <>
                                    <Button
                                        mode="contained"
                                        onPress={() => homeState.openWifiSettings()}
                                        style={STYLES.modalButton}
                                    >
                                        Open Wi-Fi Settings
                                    </Button>
                                    <Button
                                        mode="outlined"
                                        onPress={() => homeState.proceedWithCellularDownload()}
                                        style={STYLES.modalButton}
                                    >
                                        Download Anyway
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        mode="contained"
                                        onPress={() => homeState.initiateModelDownload()}
                                        style={STYLES.modalButton}
                                        disabled={isWifiConnected === null}
                                    >
                                        Download Models
                                    </Button>
                                    <Button
                                        mode="text"
                                        onPress={() => homeState.closeSetupModal()}
                                        style={STYLES.modalButton}
                                    >
                                        Remind Me Later
                                    </Button>
                                </>
                            )}
                        </View>
                    </Surface>
                </View>
            </Modal>
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
    progressBanner: { marginBottom: 16 },
    bannerTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    bannerProgress: { height: 6, borderRadius: 3 },
    bannerPercent: { fontSize: 12, marginTop: 4 },
    buttonContainer: { position: 'absolute', left: 20, right: 20, bottom: 30, alignItems: 'center' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 24 },
    modalHeader: { alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, textAlign: 'center' },
    modalBody: { marginBottom: 24 },
    modalText: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
    bold: { fontWeight: '700' },
    wifiStatus: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginTop: 8 },
    wifiText: { fontSize: 14, marginLeft: 8, fontWeight: '500' },
    cellularWarning: { padding: 12, borderRadius: 8, marginTop: 16 },
    cellularText: { fontSize: 13, lineHeight: 18 },
    modalActions: { gap: 12 },
    modalButton: { width: '100%' },
});
