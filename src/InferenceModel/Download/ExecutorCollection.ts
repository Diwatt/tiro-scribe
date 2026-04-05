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
    private readonly _currentCapability$: Observable<string | undefined>;
    private readonly _currentFileName$: Observable<string | undefined>;
    private readonly _currentFileProgress$: Observable<number>;
    private readonly _currentCapabilityProgress$: Observable<number>;
    private readonly _totalBytes$: Observable<number>;
    private readonly _capabilityProgress$: Observable<Record<string, number>>;
    private _disposeFns: (() => void)[] = [];

    public constructor() {
        this._isDownloading$ = observable(false);
        this._progress$ = observable(0);
        this._currentCapability$ = observable(undefined);
        this._currentFileName$ = observable(undefined);
        this._currentFileProgress$ = observable(0);
        this._currentCapabilityProgress$ = observable(0);
        this._totalBytes$ = observable(0);
        this._capabilityProgress$ = observable<Record<string, number>>({});
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
     * Observable for current capability being downloaded.
     */
    public get currentCapability$(): Observable<string | undefined> {
        return this._currentCapability$;
    }

    /**
     * Observable for current file name being downloaded.
     */
    public get currentFileName$(): Observable<string | undefined> {
        return this._currentFileName$;
    }

    /**
     * Observable for current file download progress (0-100).
     */
    public get currentFileProgress$(): Observable<number> {
        return this._currentFileProgress$;
    }

    /**
     * Observable for current capability's progress (0-100).
     */
    public get currentCapabilityProgress$(): Observable<number> {
        return this._currentCapabilityProgress$;
    }

    /**
     * Observable for total bytes across all executors.
     */
    public get totalBytes$(): Observable<number> {
        return this._totalBytes$;
    }

    /**
     * Observable for per-capability progress map (capability -> progress 0-100).
     */
    public get capabilityProgress$(): Observable<Record<string, number>> {
        return this._capabilityProgress$;
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
     * Get progress for a specific capability.
     */
    public getProgressForCapability(capability: string): number {
        return this._capabilityProgress$.get()[capability] ?? 0;
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
            this._currentCapability$.set(undefined);
            this._currentFileName$.set(undefined);
            this._currentFileProgress$.set(0);
            this._currentCapabilityProgress$.set(0);
            this._totalBytes$.set(0);
            this._capabilityProgress$.set({});
            return;
        }

        let isDownloading = false;
        let totalBytes = 0;
        let totalBytesDownloaded = 0;
        let currentCapability: string | undefined;
        let currentFileName: string | undefined;
        let currentFileProgress = 0;
        let currentCapabilityProgress = 0;
        let activeExecutor: DownloadTaskExecutor | undefined;
        const capabilityProgressMap: Record<string, number> = {};

        for (const executor of this._executors) {
            const executorTotalBytes = executor.totalBytes;
            totalBytes += executorTotalBytes;

            // Calculate this executor's bytes downloaded
            const executorProgress = executor.getProgress();
            const executorBytesDownloaded = (executorProgress / 100) * executorTotalBytes;
            totalBytesDownloaded += executorBytesDownloaded;

            // Store per-capability progress
            capabilityProgressMap[executor.capability] = executorProgress;

            if (executor.getState() === DownloadState.Downloading) {
                isDownloading = true;
                if (activeExecutor === undefined) {
                    activeExecutor = executor;
                }
            }
        }

        if (activeExecutor !== undefined) {
            currentCapability = activeExecutor.capability;
            currentFileName = activeExecutor.currentFileName$.get();
            currentFileProgress = activeExecutor.currentFileProgress$.get();
            currentCapabilityProgress = activeExecutor.getProgress();
        }

        this._isDownloading$.set(isDownloading);
        this._progress$.set(totalBytes > 0 ? (totalBytesDownloaded / totalBytes) * 100 : 0);
        this._currentCapability$.set(currentCapability);
        this._currentFileName$.set(currentFileName);
        this._currentFileProgress$.set(currentFileProgress);
        this._currentCapabilityProgress$.set(currentCapabilityProgress);
        this._totalBytes$.set(totalBytes);
        this._capabilityProgress$.set(capabilityProgressMap);
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