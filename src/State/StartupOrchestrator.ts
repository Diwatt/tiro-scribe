/**
 * StartupOrchestrator – Hardware check → auth check → state for routing.
 * Singleton. Run run() on app mount. State is observable via state$.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { TherapistRepository } from '@/Repository';
import { registry } from '../Database/Registry';
import { Therapist } from '../Entity/Therapist';
import { appLanguage } from '../Localization/AppLanguage';
import { deviceCompatibilityGate } from '../Security/DeviceCompatibilityGate';
import { inferenceModelDownloader } from '../Service/InferenceModelDownloader';
import { DownloadState } from '../Service/InferenceModelDownload/Type';
import { ActivityStatus, globalActivityStatus } from './GlobalActivityStatus';
import { appLogger } from '@/Service/Logger';

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
        const Ll = appLanguage.getTranslationFunctions(appLanguage.getLocale());
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
        const Ll = appLanguage.getTranslationFunctions(appLanguage.getLocale());

        // initial pending status; progress will update it
        globalActivityStatus.setStatus(ActivityStatus.Pending, Ll.download.speakerModel());

        try {
            const executor = await inferenceModelDownloader.download('speaker_id');

            // update UI as progress events arrive
            executor.progress$.onChange(({ value: progress }) => {
                console.log(`Speaker ID download progress: ${progress}%`);
                const percentage = Math.round(progress);
                const message = `${Ll.download.speakerModel()} ${percentage}%`;
                globalActivityStatus.setStatus(ActivityStatus.Pending, message);
            });

            // watch state changes to surface success or error
            const showSuccess = () => {
                console.log(`Speaker ID download successful after ${Date.now() - bootStart}ms`);
                const elapsed = Date.now() - bootStart;
                const remainingStartup = Math.max(0, STARTUP_DELAY_MS - elapsed);
                const successFn = () => {
                    globalActivityStatus.setStatus(
                        ActivityStatus.Success,
                        Ll.download.speakerModelSuccess(),
                        undefined,
                        AUTO_HIDE_DELAY_MS,
                    );
                };

                if (remainingStartup > 0) {
                    setTimeout(successFn, remainingStartup);
                } else {
                    successFn();
                }
            };

            executor.state$.onChange(({ value: state }) => {
                console.log(`Speaker ID download state changed: ${state} after ${Date.now() - bootStart}ms`);
                if (state === DownloadState.Completed) {
                    showSuccess();
                } else if (state === DownloadState.Failed || state === DownloadState.Cancelled) {
                    appLogger.error('Speaker model download failed', {
                        error: executor.getError(),
                    });
                    globalActivityStatus.setStatus(ActivityStatus.Error, Ll.download.speakerModelError());
                }
            });

            // ensure we handle the case where the executor has already reached a
            // terminal state before our subscription fired
            const initialState = executor.getState();
            if (initialState === DownloadState.Completed) {
                showSuccess();
            } else if (initialState === DownloadState.Failed || initialState === DownloadState.Cancelled) {
                appLogger.error('Speaker model download failed', {
                    error: executor.getError(),
                });
                globalActivityStatus.setStatus(ActivityStatus.Error, Ll.download.speakerModelError());
            }
        } catch (err) {
            // any problem starting or observing download
            appLogger.error('Speaker model download failed', { error: err });
            globalActivityStatus.setStatus(ActivityStatus.Error, Ll.download.speakerModelError());
            return;
        }
    }
}

export const startupOrchestrator = new StartupOrchestrator();
