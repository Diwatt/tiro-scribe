/**
 * Global activity status. Single shared slot displayed by the global bar or
 * any consumer that observes `globalActivityStatus`. There is no concept of
 * multiple named activities anymore; callers simply update status/message/icon
 * on the singleton.
 */
import { observable } from '@legendapp/state';

export enum ActivityStatus {
    Ready = 'ready',
    Pending = 'pending',
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
}

export type GlobalActivityState = {
    status: ActivityStatus;
    message: string;
    icon?: React.ReactNode;
};

export class GlobalActivityStatus {
    /**
     * single observable that holds the whole “slot” of information. keeping a
     * single object avoids partial updates being visible and simplifies
     * consumers that only care about a single subscription. the getters below
     * make it easy to access individual fields, and we still export the
     * observable so tests/components can observe as needed.
     */
    public readonly state$ = observable<GlobalActivityState>({
        status: ActivityStatus.Ready,
        message: '',
        icon: undefined,
    });

    public getIcon(): React.ReactNode | undefined {
        return this.state$.get().icon;
    }

    public getMessage(): string | undefined {
        return this.state$.get().message;
    }

    public getStatus(): ActivityStatus {
        // reading the observable within an `observer` component will
        // register the dependency, so callers don't need direct access to
        // the observable itself.
        return this.state$.get().status;
    }

    public is(status: ActivityStatus): boolean {
        return this.getStatus() === status;
    }

    public reset(): void {
        this.state$.set({
            status: ActivityStatus.Ready,
            message: '',
            icon: undefined,
        });
    }

    public setStatus(
        status: ActivityStatus,
        message: string,
        icon?: React.ReactNode,
        autoHideAfterMs: number = 0,
    ): void {
        this.state$.set({ status, message, icon });

        if (autoHideAfterMs > 0) {
            setTimeout(() => {
                this.reset();
            }, autoHideAfterMs);
        }
    }
}

export const globalActivityStatus = new GlobalActivityStatus();
