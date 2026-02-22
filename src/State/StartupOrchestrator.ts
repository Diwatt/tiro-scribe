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
import { InferenceModelDownloader } from '../Service/InferenceModelDownloader';
import { globalActivityStatus, ActivityStatus } from './GlobalActivityStatus';
import { AppLanguage } from '../Localization/AppLanguage';

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
        this.downloadSpeakerId();
    }

    /** Start Cam++ model download in background so it is ready before voice calibration step. */
    private async downloadSpeakerId(): Promise<void> {
        const key = globalActivityStatus.speakerIdDownloadKey;
        const AUTO_HIDE_DELAY_MS = 3000; // 3 seconds
        const Ll = AppLanguage.getInstance().getTranslationFunctions(AppLanguage.getInstance().getLocale());

        try {
            // Set initial status
            globalActivityStatus.setStatus(key, ActivityStatus.Pending, Ll.download.speakerModel());

            await InferenceModelDownloader.getInstance().ensureDownloaded('speaker_id', (progress: number) => {
                // Update progress with auto-hide parameter for when it reaches 100%
                globalActivityStatus.setProgress(key, progress, AUTO_HIDE_DELAY_MS);

                // Update message with percentage
                const percentage = Math.round(progress);
                // Use string interpolation since translation function with parameters might not work
                const message = `${Ll.download.speakerModel()} ${percentage}%`;
                globalActivityStatus.setStatus(key, ActivityStatus.Pending, message);
            });

            // Download completed successfully - setProgress already handles auto-hide at 100%
            // But we also call setStatus to ensure consistent state
            globalActivityStatus.setStatus(key, ActivityStatus.Success, Ll.download.speakerModelSuccess(), AUTO_HIDE_DELAY_MS);
        } catch (_error) {
            // Download failed - don't auto-hide errors
            globalActivityStatus.setStatus(key, ActivityStatus.Error, Ll.download.speakerModelError());
            // Error is already captured by the status, no need for additional logging
        }
    }
}

export const startupOrchestrator = new StartupOrchestrator();
