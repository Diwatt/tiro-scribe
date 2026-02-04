/**
 * StartupOrchestrator – Hardware check → auth check → state for routing.
 * Singleton. Run runSequence() on app mount. State is observable via @legendapp/state.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { deviceCompatibilityGate } from '../Security/DeviceCompatibilityGate';
import { Therapist } from '../Entity/Therapist';

/** Initial state → hardware check → auth check → routing. */
export enum StartupState {
  /** Initial state. */
  BOOTING = 'BOOTING',
  /** Device incompatible. */
  HARDWARE_REJECTED = 'HARDWARE_REJECTED',
  /** Device OK, no user/session. */
  ONBOARDING = 'ONBOARDING',
  /** Device OK, user has session. */
  READY = 'READY',
}

export class StartupOrchestrator {
  private readonly state: Observable<StartupState>;

  constructor(initialState: StartupState = StartupState.BOOTING) {
    this.state = observable<StartupState>(initialState);
  }

  getState(): StartupState {
    return this.state.get();
  }

  get observable(): Observable<StartupState> {
    return this.state;
  }

  async runSequence(): Promise<void> {
    this.state.set(StartupState.BOOTING);

    const compatible = deviceCompatibilityGate.isCompatible();
    if (!compatible) {
      this.state.set(StartupState.HARDWARE_REJECTED);
      return;
    }

    const hasSession = await Therapist.hasActiveSession();
    if (hasSession) {
      this.state.set(StartupState.READY);
      return;
    }

    this.state.set(StartupState.ONBOARDING);
  }
}

export const startupOrchestrator = new StartupOrchestrator();
