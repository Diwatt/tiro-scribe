/**
 * StartupOrchestrator – Hardware check → auth check → state for routing.
 * Singleton. Run run() on app mount. State is observable via state$.
 */

import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { Container } from '@/Container';
import type { TherapistRepository } from '@/Repository';
import { Therapist } from '../Entity/Therapist';
import { DownloadState } from '../Service/InferenceModelDownload/Type';
import { ActivityStatus } from './GlobalActivityStatus';

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

    public async run(): Promise<void> {
        const bootStart = Date.now();

        this.state.set(StartupState.Booting);

        // show an initial pending status during app boot; hide it after 5 seconds
        const startupDelayMs = 5000;
        const ll = Container.appLanguage.getTranslationFunctions(Container.appLanguage.getLocale());
        Container.globalActivityStatus.setStatus(
            ActivityStatus.Pending,
            ll.activity.starting(),
            undefined,
            startupDelayMs,
        );

        const compatible = Container.deviceCompatibilityGate.isCompatible();
        if (!compatible) {
            this.state.set(StartupState.HardwareRejected);
            return;
        }

        // provide explicit generic parameter so caller receives the
        // specialized interface with autocomplete support.
        const repo = await Container.registry.getRepository<TherapistRepository>(Therapist);
        const hasSession = await repo.hasActiveSession();
        if (hasSession) {
            this.state.set(StartupState.Ready);
            return;
        }

        this.state.set(StartupState.Onboarding);
        // don't await - download continues in background
        this.downloadSpeakerId(bootStart);
    }

    public get stateObservable(): Observable<StartupState> {
        return this.state;
    }

    /** Start Cam++ model download in background so it is ready before voice calibration step. */
    private async downloadSpeakerId(bootStart: number): Promise<void> {
        const autoHideDelayMs = 3000; // 3 seconds
        const startupDelayMs = 5000;
        const ll = Container.appLanguage.getTranslationFunctions(Container.appLanguage.getLocale());

        // initial pending status; progress will update it
        Container.globalActivityStatus.setStatus(ActivityStatus.Pending, ll.download.speakerModel());

        try {
            const executor = await Container.inferenceModelDownloader.download('speaker_id');

            // update UI as progress events arrive
            executor.progress$.onChange(({ value: progress }) => {
                const percentage = Math.round(progress);
                const message = `${ll.download.speakerModel()} ${percentage}%`;
                Container.globalActivityStatus.setStatus(ActivityStatus.Pending, message);
            });

            // watch state changes to surface success or error
            const showSuccess = () => {
                const elapsed = Date.now() - bootStart;
                const remainingStartup = Math.max(0, startupDelayMs - elapsed);
                const successFn = () => {
                    Container.globalActivityStatus.setStatus(
                        ActivityStatus.Success,
                        ll.download.speakerModelSuccess(),
                        undefined,
                        autoHideDelayMs,
                    );
                };

                if (remainingStartup > 0) {
                    setTimeout(successFn, remainingStartup);
                } else {
                    successFn();
                }
            };

            executor.state$.onChange(({ value: state }) => {
                if (state === DownloadState.Completed) {
                    showSuccess();
                } else if (state === DownloadState.Failed || state === DownloadState.Cancelled) {
                    Container.logger.error('Speaker model download failed', {
                        error: executor.getError(),
                    });
                    Container.globalActivityStatus.setStatus(ActivityStatus.Error, ll.download.speakerModelError());
                }
            });

            // ensure we handle the case where the executor has already reached a
            // terminal state before our subscription fired
            const initialState = executor.getState();
            if (initialState === DownloadState.Completed) {
                showSuccess();
            } else if (initialState === DownloadState.Failed || initialState === DownloadState.Cancelled) {
                Container.logger.error('Speaker model download failed', {
                    error: executor.getError(),
                });
                Container.globalActivityStatus.setStatus(ActivityStatus.Error, ll.download.speakerModelError());
            }
        } catch (err) {
            // any problem starting or observing download
            Container.logger.error('Speaker model download failed', { error: err });
            Container.globalActivityStatus.setStatus(ActivityStatus.Error, ll.download.speakerModelError());
            return;
        }
    }
}
