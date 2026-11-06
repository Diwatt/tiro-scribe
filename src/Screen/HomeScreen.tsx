import { observer } from '@legendapp/state/react';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { WifiRequiredModal } from '@/Components';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { HomeState } from '@/State/HomeState';
import { SessionsHomeScreen } from './Session/SessionsHomeScreen';

export const Home = observer((): React.JSX.Element => {
    const { LL, locale } = useLocalization();
    const homeState = Container.get(HomeState);
    const executors = homeState.executors.get();
    const isDownloading = executors.isDownloading.get();
    const currentCapability = executors.currentCapability$.get();
    const currentCapabilityProgress = executors.currentCapabilityProgress$.get();
    const setupModalVisible = homeState.setupModalVisible.get();
    const setupBannerVisible = homeState.setupBannerVisible.get();
    const downloadSizeMB = homeState.downloadSizeMB.get();
    const dateLabel = useMemo(
        () => new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
        [locale],
    );

    useEffect(() => {
        homeState.ensureSetupComplete();
    }, [homeState]);

    return (
        <View style={{ flex: 1 }}>
            <SessionsHomeScreen
                dateLabel={dateLabel}
                recent={[]}
                isSetupNeeded={setupBannerVisible && !isDownloading}
                downloadLabel={
                    isDownloading && currentCapability ? LL.download.downloading({ capability: currentCapability }) : undefined
                }
                downloadProgress={currentCapabilityProgress / 100}
                isRecordDisabled={isDownloading}
                onRecord={() => homeState.navigateToRecording(true)}
                onSetup={() => homeState.presentSetupModal()}
            />
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
