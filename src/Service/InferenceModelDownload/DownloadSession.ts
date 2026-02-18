/**
 * DownloadSession – Represents a single download session with its state and progress.
 * Single Responsibility: Model for download session data.
 */

import { observable } from '@legendapp/state';
import type { SelectedVariant } from '@/Api';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export enum DownloadState {
    Pending = 'pending',
    Downloading = 'downloading',
    Verifying = 'verifying',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled',
}

export class DownloadSession {
    private readonly _state$ = observable<DownloadState>(DownloadState.Pending);
    private readonly _progress$ = observable<number>(0);
    private readonly _error$ = observable<Error | undefined>(undefined);
    private readonly _completedAt$ = observable<Dayjs | undefined>(undefined);

    public constructor(
        public readonly capability: string,
        public readonly config: SelectedVariant,
        state: DownloadState = DownloadState.Pending,
        progress: number = 0,
        public readonly startedAt: Dayjs = dayjs(),
    ) {
        this._state$.set(state);
        this._progress$.set(progress);
    }

    public getState(): DownloadState {
        return this._state$.get();
    }

    public getProgress(): number {
        return this._progress$.get();
    }

    public getError(): Error | undefined {
        return this._error$.get();
    }

    public getCompletedAt(): Dayjs | undefined {
        return this._completedAt$.get();
    }

    public get state$() {
        return this._state$;
    }

    public get progress$() {
        return this._progress$;
    }

    public get error$() {
        return this._error$;
    }

    public get completedAt$() {
        return this._completedAt$;
    }

    public setState(state: DownloadState): void {
        this._state$.set(state);
        if (state === DownloadState.Completed || state === DownloadState.Failed || state === DownloadState.Cancelled) {
            this._completedAt$.set(dayjs());
        }
    }

    public setProgress(progress: number): void {
        this._progress$.set(progress);
    }

    public setError(error: Error | undefined): void {
        this._error$.set(error);
        if (error !== undefined) {
            this.setState(DownloadState.Failed);
        }
    }

    public setCompletedAt(completedAt: Dayjs | undefined): void {
        this._completedAt$.set(completedAt);
    }

    /**
     * Check if session is in downloading or verifying state.
     */
    public isDownloading(): boolean {
        const currentState = this.getState();
        return currentState === DownloadState.Downloading || currentState === DownloadState.Verifying;
    }

    /**
     * Cancel the session if it's currently downloading or verifying.
     * @returns true if cancelled, false if not in a cancellable state
     */
    public cancel(): boolean {
        if (this.isDownloading()) {
            this.setState(DownloadState.Cancelled);
            return true;
        }
        return false;
    }
}
