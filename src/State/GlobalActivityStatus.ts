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

export class GlobalActivityStatus {
    public readonly recoveryKitStatusKey = 'recoveryKit';

    public readonly state$ = observable<ActivityStatusByKey>({});
    public readonly message$ = observable<ActivityMessageByKey>({});

    public is(key: string, status: ActivityStatus): boolean {
        return this.getStatus(key) === status;
    }

    public setStatus(key: string, status: ActivityStatus, message?: string): void {
        this.state$[key].set(status);
        if (message !== undefined) {
            this.message$[key].set(message);
        }
    }

    public getStatus(key: string): ActivityStatus {
        return this.state$[key].get() ?? ActivityStatus.Ready;
    }

    public getMessage(key: string): string | undefined {
        return this.message$[key].get();
    }

    public reset(key: string): void {
        this.state$[key].set(ActivityStatus.Ready);
        this.message$[key].set('');
    }
}

export const globalActivityStatus = new GlobalActivityStatus();
