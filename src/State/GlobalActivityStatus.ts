/**
 * Global activity status. One key per flow (e.g. recovery kit). Components call setStatus(key, status);
 * UI (e.g. AsyncButton) observes state$ and uses is(key, status) for display.
 */
import { observable } from '@legendapp/state';

export enum ActivityStatus {
    Ready = 'ready',
    Pending = 'pending',
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
}

export type ActivityStatusByKey = Record<string, ActivityStatus>;
export type ActivityMessageByKey = Record<string, string>;
export type ActivityProgressByKey = Record<string, number>;

export class GlobalActivityStatus {
    public readonly recoveryKitStatusKey = 'recoveryKit';
    public readonly speakerIdDownloadKey = 'speakerIdDownload';

    public readonly state$ = observable<ActivityStatusByKey>({});
    public readonly message$ = observable<ActivityMessageByKey>({});
    public readonly progress$ = observable<ActivityProgressByKey>({});

    public is(key: string, status: ActivityStatus): boolean {
        return this.getStatus(key) === status;
    }

    public setStatus(key: string, status: ActivityStatus, message?: string, autoHideAfterMs?: number): void {
        this.state$[key].set(status);
        if (message !== undefined) {
            this.message$[key].set(message);
        }

        // Auto-hide for success status if specified
        if (status === ActivityStatus.Success && autoHideAfterMs !== undefined) {
            setTimeout(() => {
                this.reset(key);
            }, autoHideAfterMs);
        }
    }

    public setProgress(key: string, progress: number, autoHideAfterMs?: number): void {
        this.progress$[key].set(progress);
        // Automatically set status to Pending when progress is > 0 and < 100
        if (progress > 0 && progress < 100) {
            this.state$[key].set(ActivityStatus.Pending);
        } else if (progress >= 100) {
            this.state$[key].set(ActivityStatus.Success);
            // Auto-reset after specified time (default 3 seconds)
            const hideDelay = autoHideAfterMs !== undefined ? autoHideAfterMs : 3000;
            setTimeout(() => {
                this.reset(key);
            }, hideDelay);
        }
    }

    public getStatus(key: string): ActivityStatus {
        return this.state$[key].get() ?? ActivityStatus.Ready;
    }

    public getMessage(key: string): string | undefined {
        return this.message$[key].get();
    }

    public getProgress(key: string): number {
        return this.progress$[key].get() ?? 0;
    }

    public reset(key: string): void {
        this.state$[key].set(ActivityStatus.Ready);
        this.message$[key].set('');
        this.progress$[key].set(0);
    }
}

export const globalActivityStatus = new GlobalActivityStatus();
