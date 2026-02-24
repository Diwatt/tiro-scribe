/**
 * StartupOrchestrator – Hardware check → auth check → state for routing.
 * Singleton. Run run() on app mount. State is observable via state$.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { TherapistRepository } from '@/Repository';
import { registry } from '../Database/Registry';
import { Therapist } from '../Entity/Therapist';
import { AppLanguage } from '../Localization/AppLanguage';
import { deviceCompatibilityGate } from '../Security/DeviceCompatibilityGate';
import { InferenceModelDownloader } from '../Service/InferenceModelDownloader';
import { ActivityStatus, globalActivityStatus } from './GlobalActivityStatus';

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
        const bootStart = Date.now();

        this.state.set(StartupState.Booting);

        // show an initial pending status during app boot; hide it after 5 seconds
        const STARTUP_DELAY_MS = 5000;
        const Ll = AppLanguage.getInstance().getTranslationFunctions(AppLanguage.getInstance().getLocale());
        globalActivityStatus.setStatus(ActivityStatus.Pending, Ll.activity.starting(), undefined, STARTUP_DELAY_MS);

        const compatible = deviceCompatibilityGate.isCompatible();
        if (!compatible) {
            this.state.set(StartupState.HardwareRejected);
            return;
        }

        // provide explicit generic parameter so caller receives the
        // specialized interface with autocomplete support.
        const repo = await registry.getRepository<TherapistRepository>(Therapist);
        const hasSession = await repo.hasActiveSession();
        if (hasSession) {
            this.state.set(StartupState.Ready);
            return;
        }

        this.state.set(StartupState.Onboarding);
        // don't await - download continues in background
        this.downloadSpeakerId(bootStart);
    }

    /** Start Cam++ model download in background so it is ready before voice calibration step. */
    private async downloadSpeakerId(bootStart: number): Promise<void> {
        const AUTO_HIDE_DELAY_MS = 3000; // 3 seconds
        const STARTUP_DELAY_MS = 5000;
        const Ll = AppLanguage.getInstance().getTranslationFunctions(AppLanguage.getInstance().getLocale());

        try {
            // Set initial status
            globalActivityStatus.setStatus(ActivityStatus.Pending, Ll.download.speakerModel());

            await InferenceModelDownloader.getInstance().ensureDownloaded('speaker_id', (progress: number) => {
                // update message with percentage only; progress isn't tracked anymore
                const percentage = Math.round(progress);
                const message = `${Ll.download.speakerModel()} ${percentage}%`;
                globalActivityStatus.setStatus(ActivityStatus.Pending, message);
            });

            // compute whether we should postpone the success message until after
            // the startup notification has elapsed. If the download finishes
            // while the startup bar is still visible we delay the success state
            // so the user will actually see it once the blue bar disappears.
            const elapsed = Date.now() - bootStart;
            const remainingStartup = Math.max(0, STARTUP_DELAY_MS - elapsed);

            const showSuccess = () => {
                globalActivityStatus.setStatus(ActivityStatus.Success, Ll.download.speakerModelSuccess(), undefined, AUTO_HIDE_DELAY_MS);
            };

            if (remainingStartup > 0) {
                setTimeout(showSuccess, remainingStartup);
            } else {
                showSuccess();
            }
        } catch (_error) {
            // Download failed - don't auto-hide errors
            globalActivityStatus.setStatus(ActivityStatus.Error, Ll.download.speakerModelError());
            // Error is already captured by the status, no need for additional logging
        }
    }
}

export const startupOrchestrator = new StartupOrchestrator();
