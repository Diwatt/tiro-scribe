/**
 * DownloadSession – Represents a single download session with its state and progress.
 * Wraps an ObservableDownloadTask from DownloadQueue and adds runtime‑specific behavior.
 * Single Responsibility: Execute the download process for a queued item.
 */

import { computed, observable } from '@legendapp/state';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ModelConfig } from '@/Api';
import type { LoggerInterface } from '@/Service/Logger';
import type { ObservableDownloadTask } from './DownloadTaskManager';
import type { ChecksumVerifier } from './ChecksumVerifier';
import type { FileDownloader } from './FileDownloader';
import type { ModelArtifactStorage } from './ModelArtifactStorage';
import { DownloadState } from './Type';

export class DownloadSession {
    private readonly _startedAt: Dayjs;
    private readonly _completedAt$ = observable<Dayjs | undefined>(undefined);

    public constructor(
        private readonly logger: LoggerInterface,
        private readonly downloadTask: ObservableDownloadTask,
        private readonly modelConfig: ModelConfig,
        private readonly fileDownloader: FileDownloader,
        private readonly checksumVerifier: ChecksumVerifier,
        private readonly artifactStorage: ModelArtifactStorage,
        private readonly onProgress?: (progress: number) => void,
        private readonly onError?: (error: Error) => Promise<void>,
        private readonly onComplete?: () => Promise<void>,
        startedAt: Dayjs = dayjs(),
    ) {
        this._startedAt = startedAt;
    }

    /** Error message used to identify user‑cancelled downloads */
    private static readonly CANCELLATION_ERROR_MESSAGE = 'Download cancelled by user';

    /**
     * Computed observable for download state.
     * Returns the current DownloadState, handling special cases like cancelled downloads.
     */
    public get state$() {
        return computed(() => {
            const queueStatus = this.downloadTask.state$.get();
            const errorMessage = this.downloadTask.error$.get();

            // Check for cancelled downloads (Cancelled status or Failed with cancellation error)
            if (queueStatus === DownloadState.Cancelled) {
                return DownloadState.Cancelled;
            }
            if (queueStatus === DownloadState.Failed && errorMessage === DownloadSession.CANCELLATION_ERROR_MESSAGE) {
                return DownloadState.Cancelled;
            }

            return queueStatus;
        });
    }

    /**
     * Computed observable for progress (0‑1).
     */
    public get progress$() {
        return computed(() => this.downloadTask.progress$.get() / 100);
    }

    /**
     * Computed observable for error.
     */
    public get error$() {
        return computed(() => this.downloadTask.error$.get());
    }

    public get completedAt$() {
        return this._completedAt$;
    }

    public get capability(): string {
        return this.downloadTask.capability;
    }

    public get config(): ModelConfig {
        return this.modelConfig;
    }

    public get startedAt(): Dayjs {
        return this._startedAt;
    }

    public getState(): DownloadState {
        return this.state$.get();
    }

    public getProgress(): number {
        return this.progress$.get();
    }

    public getError(): string | undefined {
        return this.error$.get();
    }

    public getCompletedAt(): Dayjs | undefined {
        return this._completedAt$.get();
    }

    /**
     * Check if session is in downloading or verifying state.
     */
    public isDownloading(): boolean {
        const currentState = this.getState();
        return currentState === DownloadState.Downloading;
    }

    /**
     * Cancel the session if it's currently downloading or verifying.
     * @returns true if cancelled, false if not in a cancellable state
     */
    public cancel(): boolean {
        if (this.isDownloading()) {
            // Mark as cancelled in queue
            this.downloadTask.state$.set(DownloadState.Cancelled);
            this.downloadTask.error$.set(DownloadSession.CANCELLATION_ERROR_MESSAGE);
            this._completedAt$.set(dayjs());
            return true;
        }
        return false;
    }

    /**
     * Start the download process.
     * Updates the queue item's state and progress as the download proceeds.
     */
    public async start(): Promise<void> {
        // Ensure directories exist
        this.artifactStorage.ensureDirectories(this.modelConfig);

        let totalDownloaded = 0;
        const totalFiles = this.modelConfig.files.length;

        try {
            // Update queue status to Downloading
            this.downloadTask.state$.set(DownloadState.Downloading);
            this.logger.debug('[DownloadSession] Starting download session');

            for (let i = 0; i < this.modelConfig.files.length; i++) {
                const file = this.modelConfig.files[i];
                const destination = this.artifactStorage.getFile(this.modelConfig, file);

                // Download file with progress tracking
                for await (const chunkProgress of this.fileDownloader.downloadFile(file.url, destination)) {
                    // chunkProgress is 0‑1, convert to overall progress
                    const fileProgress = chunkProgress;
                    const overallProgress = (totalDownloaded + fileProgress) / totalFiles;
                    const progressPercent = overallProgress * 100;

                    // Update queue progress (0‑100)
                    this.downloadTask.progress$.set(progressPercent);

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
                this.downloadTask.progress$.set(progressAfterFile);

                // Call progress callback if provided
                if (this.onProgress) {
                    this.onProgress(progressAfterFile);
                }
            }

            // Mark as completed
            this.downloadTask.state$.set(DownloadState.Completed);
            this.downloadTask.progress$.set(100);
            this._completedAt$.set(dayjs());

            this.logger.debug('[DownloadSession] Download completed successfully');

            // Call completion callback if provided
            if (this.onComplete) {
                await this.onComplete();
            }
        } catch (error) {
            // Mark as failed
            this.downloadTask.state$.set(DownloadState.Failed);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.downloadTask.error$.set(errorMessage);
            this._completedAt$.set(dayjs());

            this.logger.error('[DownloadSession] Download failed', error);

            // Call error callback if provided
            if (this.onError) {
                const errorObj = error instanceof Error ? error : new Error(String(error));
                await this.onError(errorObj);
            }

            throw error;
        }
    }
}
