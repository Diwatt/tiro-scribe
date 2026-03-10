import { observable } from '@legendapp/state';
import type { AppLogger } from '@/Core/AppLogger';

/**
 * Abstract base class shared by every onboarding step state.
 * It exposes a basic `isBusy`/`error` pair and a utility to wrap
 * asynchronous work so that the busy flag is toggled automatically.
 */
export abstract class AbstractState {
    public readonly isBusy = observable<boolean>(false);
    public readonly error = observable<string | undefined>(undefined);

    protected constructor(protected readonly logger: AppLogger) {
        // nothing to do here other than retain the logger for subclasses
    }

    /**
     * Reset to initial (non‑busy, no error) state.  Subclasses may override
     * and call `super.reset()` if they have additional observables to clear.
     */
    public reset(): void {
        this.error.set(undefined);
        this.isBusy.set(false);
    }

    protected async runAsyncAction(action: () => Promise<void>): Promise<void> {
        this.isBusy.set(true);
        try {
            await action();
        } finally {
            this.isBusy.set(false);
        }
    }
}
