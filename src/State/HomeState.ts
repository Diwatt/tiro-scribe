import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { AppRouter } from '@/Core/AppRouter';
import { Container } from '@/Core/Container';
import { ExecutorCollection } from '@/InferenceModel/Download/ExecutorCollection';
import { Setup } from '@/InferenceModel/Setup';
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
    public readonly executors: Observable<ExecutorCollection> = observable(new ExecutorCollection());
    public readonly setupModalVisible: Observable<boolean> = observable(false);
    public readonly setupBannerVisible: Observable<boolean> = observable(false);
    public readonly downloadSizeMB: Observable<number> = observable(0);
    public readonly initialized: Observable<boolean> = observable(false);

    private readonly wifiVerifier: WifiVerifier;
    private wifiCheckInterval: ReturnType<typeof setInterval> | null = null;
    private readonly wifiCheckIntervalMs = 2000;

    public constructor(
        private readonly logger: AppLogger,
        private readonly appRouter: AppRouter,
        private readonly modelSetup: Setup,
    ) {
        this.wifiVerifier = new WifiVerifier();
    }

    /**
     * Ensure setup is complete - checks if models are downloaded.
     * If models are needed:
     *   - If Wi-Fi is connected: start download immediately
     *   - If Wi-Fi is NOT connected: show modal to prompt user to enable Wi-Fi
     * Safe to call multiple times - only runs once.
     */
    public async ensureSetupComplete(): Promise<void> {
        if (this.initialized.get()) {
            return;
        }

        const modelsReady = await this.areModelsReady();
        if (!modelsReady) {
            // Check Wi-Fi status and determine next action
            await this.checkWifiAndProceed();
        }
        this.initialized.set(true);
    }

    /**
     * Check Wi-Fi status and either start download or show modal.
     */
    private async checkWifiAndProceed(): Promise<void> {
        const isConnected = await this.wifiVerifier.isConnected();

        if (isConnected) {
            // Wi-Fi is available - start download immediately
            await this.beginModelDownload();
        } else {
            // Wi-Fi not available - show modal to prompt user
            this.downloadSizeMB.set(Math.round(await this.modelSetup.getTotalDownloadSizeMB()));
            this.presentSetupModal();
        }
    }

    /**
     * Open Wi-Fi settings and start monitoring for Wi-Fi availability.
     * When Wi-Fi becomes available, the download will start automatically.
     */
    public async openWifiSettings(): Promise<void> {
        await this.wifiVerifier.openSettings();
        await this.startWifiMonitoring();
    }

    /**
     * Start periodically checking for Wi-Fi connectivity.
     * When Wi-Fi becomes available, automatically begins the model download.
     */
    private async startWifiMonitoring(): Promise<void> {
        if (this.wifiCheckInterval !== null) {
            return;
        }

        this.wifiCheckInterval = setInterval(async () => {
            const isConnected = await this.wifiVerifier.isConnected();
            if (isConnected) {
                await this.stopWifiMonitoring();
                await this.beginModelDownload();
            }
        }, this.wifiCheckIntervalMs);
    }

    /**
     * Stop the Wi-Fi connectivity check interval.
     */
    private async stopWifiMonitoring(): Promise<void> {
        if (this.wifiCheckInterval !== null) {
            clearInterval(this.wifiCheckInterval);
            this.wifiCheckInterval = null;
        }
    }

    /**
     * Proceed with download on cellular network (user confirmed).
     */
    public async proceedWithCellularDownload(): Promise<void> {
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
        this.setupBannerVisible.set(false);
        this.executors.set(await this.modelSetup.getExecutors());
    }

    /**
     * Show the setup modal.
     */
    public presentSetupModal(): void {
        this.setupModalVisible.set(true);
    }

    /**
     * Close the setup modal without starting download.
     * Shows the setup banner as fallback.
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
        Container.get(Setup),
    );
});