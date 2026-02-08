/**
 * Global app async status. One key per flow (e.g. recovery kit). Components call setStatus(key, status);
 * UI (e.g. AsyncButton) observes state$ and uses is(key, status) for display.
 */
import { observable } from '@legendapp/state';

export enum AsyncStatus {
    Idle = 'idle',
    Pending = 'pending',
    Success = 'success',
    Error = 'error',
}

export type AsyncStatusByKey = Record<string, AsyncStatus>;

export class AppAsyncStatus {
    public readonly recoveryKitStatusKey = 'recoveryKit';

    public readonly state$ = observable<AsyncStatusByKey>({});

    public is(key: string, status: AsyncStatus): boolean {
        return this.getStatus(key) === status;
    }

    public setStatus(key: string, status: AsyncStatus): void {
        this.state$[key].set(status);
    }

    public getStatus(key: string): AsyncStatus {
        return this.state$[key].get() ?? AsyncStatus.Idle;
    }

    public reset(key: string): void {
        this.state$[key].set(AsyncStatus.Idle);
    }
}

export const appAsyncStatus = new AppAsyncStatus();
