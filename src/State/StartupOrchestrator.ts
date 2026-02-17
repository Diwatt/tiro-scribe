/**
 * StartupOrchestrator – Hardware check → auth check → state for routing.
 * Singleton. Run run() on app mount. State is observable via state$.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { registry } from '../Database/Registry';
import type { TherapistRepository } from '@/Repository';
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

        const repo = await registry.getRepository<Therapist, TherapistRepository>(Therapist);
        const hasSession = await repo.hasActiveSession();
        if (hasSession) {
            this.state.set(StartupState.Ready);
            return;
        }

        this.state.set(StartupState.Onboarding);
        this.predownloadCamPlusModel();
    }

    /** Start Cam++ model download in background so it is ready before voice calibration step. */
    private predownloadCamPlusModel(): void {
        import('../Service/ArtifactRegistry').then(({ ArtifactRegistry }): Promise<string> => {
            return ArtifactRegistry.getInstance().ensureCachedByKey('speaker_id');
        }).catch(() => {
            // Ignore; VoiceCalibration.run() will retry or use placeholder
        });
    }
}

export const startupOrchestrator = new StartupOrchestrator();
