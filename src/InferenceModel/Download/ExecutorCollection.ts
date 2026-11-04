/**
 * ExecutorCollection - Manages a collection of download executors with computed state.
 *
 * Provides derived observables for the active download, as displayed on the Home screen.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { DownloadTaskExecutor } from './DownloadTaskExecutor';
import { DownloadState } from './Type';

export class ExecutorCollection {
    private readonly _executors: DownloadTaskExecutor[] = [];
    private readonly _isDownloading$: Observable<boolean>;
    private readonly _currentCapability$: Observable<string | undefined>;
    private readonly _currentFileName$: Observable<string | undefined>;
    private readonly _currentFileProgress$: Observable<number>;
    private readonly _currentCapabilityProgress$: Observable<number>;
    private _disposeFns: (() => void)[] = [];

    public constructor() {
        this._isDownloading$ = observable(false);
        this._currentCapability$ = observable(undefined);
        this._currentFileName$ = observable(undefined);
        this._currentFileProgress$ = observable(0);
        this._currentCapabilityProgress$ = observable(0);
    }

    /**
     * Observable for aggregate downloading state.
     */
    public get isDownloading(): Observable<boolean> {
        return this._isDownloading$;
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
            this._currentCapability$.set(undefined);
            this._currentFileName$.set(undefined);
            this._currentFileProgress$.set(0);
            this._currentCapabilityProgress$.set(0);
            return;
        }

        let isDownloading = false;
        let activeExecutor: DownloadTaskExecutor | undefined;

        for (const executor of this._executors) {
            if (executor.getState() === DownloadState.Downloading) {
                isDownloading = true;
                if (activeExecutor === undefined) {
                    activeExecutor = executor;
                }
            }
        }

        this._isDownloading$.set(isDownloading);
        this._currentCapability$.set(activeExecutor?.capability);
        this._currentFileName$.set(activeExecutor?.currentFileName$.get());
        this._currentFileProgress$.set(activeExecutor?.currentFileProgress$.get() ?? 0);
        this._currentCapabilityProgress$.set(activeExecutor?.progress$.get() ?? 0);
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
