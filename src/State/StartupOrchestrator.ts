/**
 * StartupOrchestrator – Hardware Check → Auth Check → state for routing.
 * Global singleton using @legendapp/state. Run runSequence() on app mount.
 */

import { observable } from '@legendapp/state';
import { deviceCompatibilityGate } from '../Security/DeviceCompatibilityGate';
import { Therapist } from '../Entity/Therapist';

export type StartupState =
    | 'BOOTING'           // Initial state
    | 'HARDWARE_REJECTED' // Device incompatible
    | 'ONBOARDING'       // Device OK, no user/session
    | 'READY';           // Device OK, user has session

const startupState = observable<StartupState>('BOOTING');

export const startupOrchestrator = {
    getState(): StartupState {
        return startupState.get();
    },

    get observable() {
        return startupState;
    },

    async runSequence(): Promise<void> {
        startupState.set('BOOTING');

        const compatible = deviceCompatibilityGate.isCompatible();
        if (!compatible) {
            startupState.set('HARDWARE_REJECTED');
            return;
        }

        const hasSession = await Therapist.hasActiveSession();
        if (hasSession) {
            startupState.set('READY');
            return;
        }

        startupState.set('ONBOARDING');
    },
};
