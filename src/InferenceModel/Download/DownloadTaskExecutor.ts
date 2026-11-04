/**
 * DownloadTaskExecutor – Executes a single download task with state and progress tracking.
 * Single Responsibility: Execute the download process for a queued item.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { InferenceModelFile, ModelConfig } from '@/Api';
import type { AppLogger } from '@/Core/AppLogger';
import { DownloadQueue } from '@/Entity/DownloadQueue';
import type { ChecksumVerifier } from './ChecksumVerifier';
import { FileDownloader } from './FileDownloader';
import type { ModelArtifactStorage } from './ModelArtifactStorage';
import { DownloadState } from './Type';

export class DownloadTaskExecutor {
    /** Error message used to identify user‑cancelled downloads */
    private static readonly CANCELLATION_ERROR_MESSAGE = 'Download cancelled by user';
    private readonly _currentFileName$ = observable<string | undefined>(undefined);
    private readonly _currentFileProgress$ = observable<number>(0);
    private readonly _error$ = observable<string | undefined>(undefined);
    private readonly _progress$ = observable<number>(0);
    private readonly _state$ = observable<DownloadState>(DownloadState.Pending);

    public constructor(
        private readonly logger: AppLogger,
        private readonly queueEntity: DownloadQueue,
        private readonly modelConfig: ModelConfig,
        private readonly checksumVerifier: ChecksumVerifier,
        private readonly artifactStorage: ModelArtifactStorage,
    ) {
        this._error$ = observable<string | undefined>(queueEntity.errorMessage || undefined);
        this._progress$ = observable<number>(queueEntity.progressPercent);
        this._state$ = observable<DownloadState>(queueEntity.status as unknown as DownloadState);
    }

    /**
     * Cancel the download if it's currently downloading.
     * @returns true if cancelled, false if not in a cancellable state
     */
    public cancel(): boolean {
        if (this.isDownloading()) {
            this.setState(DownloadState.Cancelled);
            this.setError(DownloadTaskExecutor.CANCELLATION_ERROR_MESSAGE);
            return true;
        }
        return false;
    }

    public get capability(): string {
        return this.queueEntity.capability;
    }

    public get currentFileName$(): Observable<string | undefined> {
        return this._currentFileName$;
    }

    public get currentFileProgress$(): Observable<number> {
        return this._currentFileProgress$;
    }

    public get config(): ModelConfig {
        return this.modelConfig;
    }

    /**
     * Create a dummy executor already in the `Completed` state.
     *
     * This is used when the model files are already present locally and we
     * want to hand back an observable object without performing any download
     * work or touching the queue database. The returned executor will report
     * `state$ === DownloadState.Completed` and `progress$ === 100`.
     *
     * Note: the underlying `queueEntity` is a throwaway object that is **not**
     * persisted anywhere; its only purpose is to satisfy the executor's
     * constructor requirements.
     */
    public static createCompleted(
        capability: string,
        config: ModelConfig,
        logger: AppLogger,
        artifactStorage: ModelArtifactStorage,
        checksumVerifier: ChecksumVerifier,
    ): DownloadTaskExecutor {
        // use entity helper to avoid repeating fields inline
        const fakeQueue = DownloadQueue.createCompleted(capability);

        const executor = new DownloadTaskExecutor(logger, fakeQueue, config, checksumVerifier, artifactStorage);
        // make sure observables are in the completed state using setters
        executor.setState(DownloadState.Completed);
        executor.setProgress(100);

        return executor;
    }

    public getError(): string | undefined {
        return this._error$.get();
    }

    public getState(): DownloadState {
        return this._state$.get();
    }

    /**
     * Total bytes for all files in this executor's model config.
     */
    private get totalBytes(): number {
        return this.modelConfig.files.reduce((sum, file) => sum + file.sizeBytes, 0);
    }

    /**
     * Check if executor is in downloading state.
     */
    public isDownloading(): boolean {
        const currentState = this.getState();

        return currentState === DownloadState.Downloading;
    }

    /**
     * Observable for progress (0-100).
     */
    public get progress$(): Observable<number> {
        return this._progress$;
    }

    /**
     * Start the download process.
     * Updates observables and the queue entity as the download proceeds.
     */
    public async start(): Promise<void> {
        // Ensure directories exist and wait for completion
        await this.artifactStorage.ensureDirectories(this.modelConfig);

        let totalBytesDownloaded = 0;
        const totalModelBytes = this.totalBytes;

        try {
            // Update state to Downloading
            this.setState(DownloadState.Downloading);
            this.logger.debug('[DownloadTaskExecutor] Starting download task execution');

            for (const file of this.modelConfig.files) {
                await this.downloadFile(file, totalBytesDownloaded, totalModelBytes);
                totalBytesDownloaded += file.sizeBytes;
            }

            // Mark as completed
            this.setState(DownloadState.Completed);
            this.setProgress(100);

            this.logger.debug('[DownloadTaskExecutor] Download completed successfully');
        } catch (error) {
            // Mark as failed
            this.setState(DownloadState.Failed);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.setError(errorMessage);

            this.logger.error('[DownloadTaskExecutor] Download failed', error);

            throw error;
        }
    }

    /**
     * Observable for download state.
     */
    public get state$(): Observable<DownloadState> {
        return this._state$;
    }

    /**
     * Download a single file and verify its checksum.
     */
    private async downloadFile(
        file: InferenceModelFile,
        totalBytesDownloaded: number,
        totalModelBytes: number,
    ): Promise<void> {
        const filename = new URL(file.url).pathname.split('/').pop() ?? 'unknown';
        this._currentFileName$.set(filename);
        this._currentFileProgress$.set(0);

        const destination = this.artifactStorage.getFile(this.modelConfig, file);
        const downloader = new FileDownloader(destination, this.logger);

        await downloader.download(file.url, file.sizeBytes, (chunkProgress: number) => {
            const fileBytesDownloaded = chunkProgress * file.sizeBytes;
            const currentFileProgress = chunkProgress * 100;

            this._currentFileProgress$.set(currentFileProgress);

            const overallProgress = (totalBytesDownloaded + fileBytesDownloaded) / totalModelBytes;
            const progressPercent = overallProgress * 100;

            this.setProgress(progressPercent);
        });

        // Verify hash using the strict 64KB chunk reader
        await this.checksumVerifier.verify(destination, file.hash);
    }

    /**
     * Set error message observable.
     */
    private setError(error: string | undefined): void {
        this._error$.set(error);
    }

    /**
     * Update progress (0‑100).
     */
    private setProgress(progress: number): void {
        this._progress$.set(progress);
    }

    /**
     * Set the current download state.
     */
    private setState(state: DownloadState): void {
        this._state$.set(state);
    }
}
