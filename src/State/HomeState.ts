import { AppLogger } from '@/Core/AppLogger';
import { AppRouter } from '@/Core/AppRouter';
import { Container } from '@/Core/Container';
import { ExecutorCollection } from '@/Service/InferenceModelDownload/ExecutorCollection';
import { InferenceModelSetup } from '@/Service/InferenceModelSetup';

/**
 * HomeState
 *
 * Manages UI state related to the Home screen (banner, download progress,
 * "initializing AI" indicator, and interactions with the global activity bar).
 *
 * This is intentionally small and focused - keep business logic in services.
 */
export class HomeState {
    public readonly executors: ExecutorCollection;

    public constructor(
        private readonly logger: AppLogger,
        private readonly appRouter: AppRouter,
        private readonly modelSetup: InferenceModelSetup,
    ) {
        this.executors = new ExecutorCollection();
    }

    /**
     * Check if all required models are already downloaded.
     */
    public async isSetup(): Promise<boolean> {
        return this.modelSetup.isSetup();
    }

    /**
     * Load model executors for observation.
     */
    public async loadExecutors(): Promise<void> {
        const downloadExecutors = await this.modelSetup.getExecutors();
        this.executors.setExecutors(downloadExecutors);
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
