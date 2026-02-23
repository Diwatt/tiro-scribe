/**
 * DownloadTaskExecutor – Executes a single download task with state and progress tracking.
 * Takes a plain DownloadQueue entity and owns all runtime observables.
 * Single Responsibility: Execute the download process for a queued item.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ModelConfig } from '@/Api';
import type { DownloadQueue } from '@/Entity/DownloadQueue';
import type { LoggerInterface } from '@/Service/Logger';
import type { ChecksumVerifier } from './ChecksumVerifier';
import { FileDownloader } from './FileDownloader';
import type { ModelArtifactStorage } from './ModelArtifactStorage';
import { DownloadState } from './Type';

export class DownloadTaskExecutor {
    private readonly queueEntity: DownloadQueue;
    private readonly _startedAt: Dayjs;
    private readonly _state$: Observable<DownloadState>;
    private readonly _progress$: Observable<number>;
    private readonly _error$: Observable<string | undefined>;
    private readonly _completedAt$ = observable<Dayjs | undefined>(undefined);

    public constructor(
        private readonly logger: LoggerInterface,
        queueEntity: DownloadQueue,
        private readonly modelConfig: ModelConfig,
        private readonly checksumVerifier: ChecksumVerifier,
        private readonly artifactStorage: ModelArtifactStorage,
        private readonly onProgress?: (progress: number) => void,
        private readonly onError?: (error: Error) => Promise<void>,
        private readonly onComplete?: () => Promise<void>,
        startedAt: Dayjs = dayjs(),
    ) {
        this.queueEntity = queueEntity;
        this._startedAt = startedAt;

        // Create observables from entity's current state
        this._state$ = observable<DownloadState>(queueEntity.status as unknown as DownloadState);
        this._progress$ = observable<number>(queueEntity.progressPercent);
        this._error$ = observable<string | undefined>(queueEntity.errorMessage || undefined);
    }

    /** Error message used to identify user‑cancelled downloads */
    private static readonly CANCELLATION_ERROR_MESSAGE = 'Download cancelled by user';

    /**
     * Observable for download state.
     */
    public get state$(): Observable<DownloadState> {
        return this._state$;
    }

    /**
     * Observable for progress (0-100).
     */
    public get progress$(): Observable<number> {
        return this._progress$;
    }

    /**
     * Observable for error message.
     */
    public get error$(): Observable<string | undefined> {
        return this._error$;
    }

    public get completedAt$() {
        return this._completedAt$;
    }

    public get capability(): string {
        return this.queueEntity.capability;
    }

    public get config(): ModelConfig {
        return this.modelConfig;
    }

    public get startedAt(): Dayjs {
        return this._startedAt;
    }

    public getState(): DownloadState {
        return this._state$.get();
    }

    public getProgress(): number {
        return this._progress$.get();
    }

    public getError(): string | undefined {
        return this._error$.get();
    }

    public getCompletedAt(): Dayjs | undefined {
        return this._completedAt$.get();
    }

    public getQueueEntity(): DownloadQueue {
        return this.queueEntity;
    }

    /**
     * Check if executor is in downloading state.
     */
    public isDownloading(): boolean {
        const currentState = this.getState();
        return currentState === DownloadState.Downloading;
    }

    /**
     * Cancel the download if it's currently downloading.
     * @returns true if cancelled, false if not in a cancellable state
     */
    public cancel(): boolean {
        if (this.isDownloading()) {
            this._state$.set(DownloadState.Cancelled);
            this._error$.set(DownloadTaskExecutor.CANCELLATION_ERROR_MESSAGE);
            this._completedAt$.set(dayjs());
            return true;
        }
        return false;
    }

    /**
     * Start the download process.
     * Updates observables and the queue entity as the download proceeds.
     */
    public async start(): Promise<void> {
        // Ensure directories exist and wait for completion
        await this.artifactStorage.ensureDirectories(this.modelConfig);

        let totalDownloaded = 0;
        const totalFiles = this.modelConfig.files.length;

        try {
            // Update state to Downloading
            this._state$.set(DownloadState.Downloading);
            this.logger.debug('[DownloadTaskExecutor] Starting download task execution');

            for (let i = 0; i < this.modelConfig.files.length; i++) {
                const file = this.modelConfig.files[i];
                const destination = this.artifactStorage.getFile(this.modelConfig, file);

                // Create downloader for this file and download with progress tracking
                const downloader = new FileDownloader(destination, this.logger);
                for await (const chunkProgress of downloader.download(file.url)) {
                    // chunkProgress is 0‑1, convert to overall progress
                    const fileProgress = chunkProgress;
                    const overallProgress = (totalDownloaded + fileProgress) / totalFiles;
                    const progressPercent = overallProgress * 100;

                    // Update progress observable (0‑100)
                    this._progress$.set(progressPercent);

                    // Call progress callback if provided
                    if (this.onProgress) {
                        this.onProgress(progressPercent);
                    }
                }

                // Verify hash if provided
                if (file.hash) {
                    await this.checksumVerifier.verify(destination, file.hash);
                }

                totalDownloaded += 1;
                const progressAfterFile = (totalDownloaded / totalFiles) * 100;
                // Update progress after each file
                this._progress$.set(progressAfterFile);

                // Call progress callback if provided
                if (this.onProgress) {
                    this.onProgress(progressAfterFile);
                }
            }

            // Mark as completed
            this._state$.set(DownloadState.Completed);
            this._progress$.set(100);
            this._completedAt$.set(dayjs());

            this.logger.debug('[DownloadTaskExecutor] Download completed successfully');

            // Call completion callback if provided
            if (this.onComplete) {
                await this.onComplete();
            }
        } catch (error) {
            // Mark as failed
            this._state$.set(DownloadState.Failed);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this._error$.set(errorMessage);
            this._completedAt$.set(dayjs());

            this.logger.error('[DownloadTaskExecutor] Download failed', error);

            // Call error callback if provided
            if (this.onError) {
                const errorObj = error instanceof Error ? error : new Error(String(error));
                await this.onError(errorObj);
            }

            throw error;
        }
    }
}
