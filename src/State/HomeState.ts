import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { AppRouter } from '@/Core/AppRouter';
import { Container } from '@/Core/Container';
import { Registry } from '@/Database/Registry';
import { Localization } from '@/Localization';
import { ActivityStatus, GlobalActivityStatus } from '@/State/GlobalActivityStatus';

/**
 * HomeState
 *
 * Manages UI state related to the Home screen (banner, download progress,
 * "initializing AI" indicator, and interactions with the global activity bar).
 *
 * This is intentionally small and focused — keep business logic in services and
 * use the global activity slot to show transient user-facing activity.
 */
export class HomeState {
    // Observables consumed by HomeScreen
    public readonly isDownloading: Observable<boolean> = observable<boolean>(false);
    public readonly progress: Observable<number> = observable<number>(0);
    public readonly bannerMessage: Observable<string | undefined> = observable<string | undefined>(undefined);

    public constructor(
        private readonly logger: AppLogger,
        private readonly globalActivityStatus: GlobalActivityStatus,
        private readonly localization: Localization,
        private readonly registry: Registry,
        private readonly appRouter: AppRouter,
    ) {}

    /**
     * Mark downloading state. When set to `true` the global activity bar is
     * updated to a Pending state with a suitable localized message. When set
     * to `false` the activity slot is reset.
     */
    public setDownloading(isDownloading: boolean, message?: string): void {
        this.isDownloading.set(isDownloading);
        if (message !== undefined) {
            this.bannerMessage.set(message);
        }

        if (isDownloading) {
            const ll = this.localization.getTranslationFunctions(this.localization.getLocale());
            const msg = message ?? ll.home.initializingAi();
            try {
                this.globalActivityStatus.setStatus(ActivityStatus.Pending, msg);
            } catch (err) {
                // Guard against any unexpected errors from the global status
                this.logger.error('[HomeState] failed to set global activity status', { error: err });
            }
        } else {
            try {
                this.globalActivityStatus.reset();
            } catch (err) {
                this.logger.error('[HomeState] failed to reset global activity status', { error: err });
            }
        }
    }

    /**
     * Update download progress (0..1). Also updates the banner message if a
     * localized progress string is desired.
     */
    public setProgress(value: number): void {
        const clamped = Math.max(0, Math.min(1, value));
        this.progress.set(clamped);

        // Update an inline banner message if present and also keep the global
        // activity message in sync with a simple percentage when downloading.
        if (this.isDownloading.get()) {
            const ll = this.localization.getTranslationFunctions(this.localization.getLocale());
            const percentage = Math.round(clamped * 100);
            const progressMessage = `${ll.home.initializingAi()} ${percentage}%`;
            try {
                this.globalActivityStatus.setStatus(ActivityStatus.Pending, progressMessage);
                this.bannerMessage.set(progressMessage);
            } catch (err) {
                this.logger.debug('[HomeState] unable to update progress message', { error: err });
            }
        }
    }

    /**
     * Reset home-specific UI state.
     */
    public reset(): void {
        this.isDownloading.set(false);
        this.progress.set(0);
        this.bannerMessage.set(undefined);
        try {
            this.globalActivityStatus.reset();
        } catch (err) {
            this.logger.debug('[HomeState] failed to reset global activity status', { error: err });
        }
    }

    /**
     * Navigate to recording screen using the app router. Kept here so the
     * HomeScreen component remains purely presentational.
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
 * Register HomeState in the app Container so it can be retrieved via
 * `Container.get(HomeState)` like other states.
 */
Container.register(HomeState, () => {
    const logger = Container.get(AppLogger);
    const globalActivityStatus = Container.get(GlobalActivityStatus);
    const localization = Container.get(Localization);
    const registry = Container.get(Registry);
    const appRouter = Container.get(AppRouter);

    return new HomeState(logger, globalActivityStatus, localization, registry, appRouter);
});
