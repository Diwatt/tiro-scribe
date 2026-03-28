/**
 * ExecutorCollection - Manages a collection of download executors with computed state.
 *
 * Provides derived observables for aggregate progress and downloading state.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { DownloadTaskExecutor } from './DownloadTaskExecutor';
import { DownloadState } from './Type';

export class ExecutorCollection {
    private readonly _executors: DownloadTaskExecutor[] = [];
    private readonly _isDownloading$: Observable<boolean>;
    private readonly _progress$: Observable<number>;
    private _disposeFns: (() => void)[] = [];

    public constructor() {
        this._isDownloading$ = observable(false);
        this._progress$ = observable(0);
    }

    /**
     * Observable for aggregate downloading state.
     */
    public get isDownloading(): Observable<boolean> {
        return this._isDownloading$;
    }

    /**
     * Observable for aggregate progress (0-1).
     */
    public get progress(): Observable<number> {
        return this._progress$;
    }

    /**
     * Get executor at index.
     */
    public get(index: number): DownloadTaskExecutor | undefined {
        return this._executors[index];
    }

    /**
     * Get all executors.
     */
    public get all(): readonly DownloadTaskExecutor[] {
        return this._executors;
    }

    /**
     * Set executors and subscribe to their state changes.
     */
    public setExecutors(executors: DownloadTaskExecutor[]): void {
        this.dispose();
        this._executors.length = 0;
        this._executors.push(...executors);

        for (const executor of executors) {
            const disposeState = executor.state$.onChange(() => this.updateComputed());
            const disposeProgress = executor.progress$.onChange(() => this.updateComputed());
            this._disposeFns.push(disposeState, disposeProgress);
        }

        this.updateComputed();
    }

    private updateComputed(): void {
        if (this._executors.length === 0) {
            this._isDownloading$.set(false);
            this._progress$.set(0);
            return;
        }

        let isDownloading = false;
        let totalProgress = 0;

        for (const executor of this._executors) {
            if (executor.getState() === DownloadState.Downloading) {
                isDownloading = true;
            }
            totalProgress += executor.getProgress();
        }

        this._isDownloading$.set(isDownloading);
        this._progress$.set(totalProgress / this._executors.length / 100);
    }

    /**
     * Clean up subscriptions.
     */
    public dispose(): void {
        for (const dispose of this._disposeFns) {
            dispose();
        }
        this._disposeFns = [];
    }
}
