import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { AppRouter } from '@/Core/AppRouter';
import { Container } from '@/Core/Container';
import { ExecutorCollection } from '@/Service/InferenceModelDownload/ExecutorCollection';
import { InferenceModelSetup } from '@/Service/InferenceModelSetup';
import { WifiVerifier } from '@/Service/WifiVerifier';

/**
 * HomeState
 *
 * Manages UI state related to the Home screen (banner, download progress,
 * "initializing AI" indicator, and interactions with the global activity bar).
 *
 * This is intentionally small and focused - keep business logic in services.
 */
export class HomeState {
    public executors: ExecutorCollection;
    public readonly setupModalVisible: Observable<boolean> = observable(false);
    public readonly setupBannerVisible: Observable<boolean> = observable(false);
    public readonly downloadSizeMB: Observable<number> = observable(0);
    public readonly isWifiConnected: Observable<boolean | null> = observable(null);
    public readonly showCellularWarning: Observable<boolean> = observable(false);
    public readonly initialized: Observable<boolean> = observable(false);

    private readonly wifiVerifier: WifiVerifier;

    public constructor(
        private readonly logger: AppLogger,
        private readonly appRouter: AppRouter,
        private readonly modelSetup: InferenceModelSetup,
    ) {
        this.executors = new ExecutorCollection();
        this.wifiVerifier = new WifiVerifier();
    }

    /**
     * Ensure setup is complete - checks if models are downloaded,
     * shows setup modal if not. Safe to call multiple times - only runs once.
     */
    public async ensureSetupComplete(): Promise<void> {
        if (this.initialized.get()) {
            return;
        }

        const modelsReady = await this.areModelsReady();
        if (!modelsReady) {
            this.presentSetupModal();
            this.downloadSizeMB.set(Math.round(await this.modelSetup.getTotalDownloadSizeMB()));
            this.isWifiConnected.set(await this.wifiVerifier.isConnected());
        }
        this.initialized.set(true);
    }

    /**
     * Initiate model download - checks Wi-Fi first and handles the flow.
     */
    public async initiateModelDownload(): Promise<void> {
        const wifi = await this.wifiVerifier.isConnected();
        this.isWifiConnected.set(wifi);

        if (wifi) {
            await this.beginModelDownload();
        } else {
            this.showCellularWarning.set(true);
        }
    }

    /**
     * Open Wi-Fi settings.
     */
    public async openWifiSettings(): Promise<void> {
        await this.wifiVerifier.openSettings();
    }

    /**
     * Proceed with download on cellular network.
     */
    public async proceedWithCellularDownload(): Promise<void> {
        this.showCellularWarning.set(false);
        await this.beginModelDownload();
    }

    /**
     * Check if all required models are already downloaded.
     */
    public async areModelsReady(): Promise<boolean> {
        return this.modelSetup.isSetup();
    }

    /**
     * Begin the model download process.
     */
    public async beginModelDownload(): Promise<void> {
        this.setupModalVisible.set(false);
        this.executors = await this.modelSetup.getExecutors();
    }

    /**
     * Show the setup modal.
     */
    public presentSetupModal(): void {
        this.setupModalVisible.set(true);
    }

    /**
     * Close the setup modal and show banner.
     */
    public closeSetupModal(): void {
        this.setupModalVisible.set(false);
        this.setupBannerVisible.set(true);
    }

    /**
     * Hide the setup banner.
     */
    public hideSetupBanner(): void {
        this.setupBannerVisible.set(false);
    }

    /**
     * Navigate to recording screen using the app router.
     */
    public navigateToRecording(autoStart = false): void {
        const path = autoStart ? '/main/recording?autoStart=true' : '/main/recording';
        try {
            this.appRouter.push(path);
        } catch (err) {
            this.logger.error('[HomeState] navigation to recording failed', { error: err });
        }
    }
}

/**
 * Register HomeState in the app Container.
 */
Container.register(HomeState, () => {
    return new HomeState(
        Container.get(AppLogger),
        Container.get(AppRouter),
        Container.get(InferenceModelSetup),
    );
});