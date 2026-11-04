import type { AppLogger } from '@/Core/AppLogger';
import type { Downloader } from '../Downloader';
import type { ExecuTorchRuntime } from '../ExecuTorch';
import { ExecuTorchBundle } from '../ExecuTorch';

/**
 * AbstractModel – Lifecycle only. Every capability owns its inference engine
 * end to end (self-managed): download, program hydration, artifact reads,
 * execution and disposal flow through its ExecuTorchBundle; subclasses
 * provide the pipeline (loadBundle, releaseBundle) and run().
 */
export abstract class AbstractModel {
    protected readonly bundle: ExecuTorchBundle;
    private isInitialized = false;

    protected constructor(
        capability: string,
        downloader: Downloader,
        executorch: ExecuTorchRuntime,
        protected readonly logger: AppLogger,
    ) {
        this.bundle = new ExecuTorchBundle(capability, downloader, executorch);
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            await this.bundle.ensureDownloaded();
            await this.loadBundle();
            this.isInitialized = true;
            this.logger.debug(`[${this.bundle.getCapability()}] Model initialized`);
        } catch (error) {
            this.logger.error(`[${this.bundle.getCapability()}] Failed to initialize`, { error });
            throw error;
        }
    }

    public async dispose(): Promise<void> {
        try {
            await this.bundle.disposeAll();
            this.releaseBundle();
            this.isInitialized = false;
            this.logger.debug(`[${this.bundle.getCapability()}] Model disposed`);
        } catch (error) {
            this.logger.error(`[${this.bundle.getCapability()}] Error during dispose`, { error });
        }
    }

    public async isReady(): Promise<boolean> {
        return this.isInitialized;
    }

    protected abstract loadBundle(): Promise<void>;

    protected abstract releaseBundle(): void;
}
