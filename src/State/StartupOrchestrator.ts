/**
 * StartupOrchestrator – Hardware check → auth check → state for routing.
 * Singleton. Run run() on app mount. State is observable via state$.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { Therapist } from '../Entity/Therapist';
import { deviceCompatibilityGate } from '../Security/DeviceCompatibilityGate';

/** Initial state → hardware check → auth check → routing. */
export enum StartupState {
    /** Initial state. */
    Booting = 'booting',
    /** Device incompatible. */
    HardwareRejected = 'hardware_rejected',
    /** Device OK, no user/session. */
    Onboarding = 'onboarding',
    /** Device OK, user has session. */
    Ready = 'ready',
}

export class StartupOrchestrator {
    private readonly state: Observable<StartupState>;

    public constructor(initialState: StartupState = StartupState.Booting) {
        this.state = observable<StartupState>(initialState);
    }

    public get state$(): Observable<StartupState> {
        return this.state;
    }

    public async run(): Promise<void> {
        this.state.set(StartupState.Booting);

        const compatible = deviceCompatibilityGate.isCompatible();
        if (!compatible) {
            this.state.set(StartupState.HardwareRejected);
            return;
        }

        const hasSession = await Therapist.hasActiveSession();
        if (hasSession) {
            this.state.set(StartupState.Ready);
            return;
        }

        this.state.set(StartupState.Onboarding);
    }
}

export const startupOrchestrator = new StartupOrchestrator();
