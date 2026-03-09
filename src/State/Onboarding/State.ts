/**
 * OnboardingState – ViewModel for the onboarding wizard. Orchestrates flow via Entity (Therapist),
 * Database (registry), and Service (VoiceCalibrator). Manages observables and RecoveryKit (UI-bound).
 */

import { observable } from '@legendapp/state';
import { AppConfig } from '@/Core/AppConfig';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Registry } from '@/Database/Registry';
import { Localization } from '@/Localization';
import { ProjectionMatrixFactory } from '@/Math/ProjectionMatrixFactory';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { VoiceCalibrator } from '@/Service';
import type { DownloadTaskExecutor } from '@/Service/InferenceModelDownload/DownloadTaskExecutor';
// new imports for download tracking
import { DownloadState } from '@/Service/InferenceModelDownload/Type';
import { InferenceModelDownloader } from '@/Service/InferenceModelDownloader';
import { GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { StartupOrchestrator } from '@/State/StartupOrchestrator';
import { Therapist } from '../../Entity/Therapist';
import { CryptoEngine, RecoveryCode, RecoveryKit } from '../../Security';
import type { CreateTherapistInput } from '../../Security/TherapistForge';
import { TherapistForge } from '../../Security/TherapistForge';
import { ActivityStatus } from '../GlobalActivityStatus';
import { FormValidator, type ProfileStepData } from './FormValidator';
import type { OnboardingFormData } from './Schema';
import type { ValidationResult } from './Types';

/** Re-export for consumers. */
export type { ValidationResult } from './Types';

/** Number of steps in the onboarding wizard (progress UI). */
export const ONBOARDING_STEPS = 4;

export type OnboardingStateShape = {
    step: number;
    isBusy: boolean;
    error: string | undefined;
    recoveryCode: string;
    practiceLanguages: string[];
};

export class OnboardingState {
    private pendingTherapist: Therapist | null = null;

    /** indicates whether the speaker model is currently downloading */
    public readonly isSpeakerModelDownloading = observable<boolean>(false);

    /** progress percentage (0-100) of the speaker model download; 0 when not downloading */
    public readonly speakerModelProgress = observable<number>(0);

    /** whether a usable copy of the speaker model exists locally */
    public readonly isSpeakerModelReady = observable<boolean>(false);

    /** executor returned by InferenceModelDownloader.download to track/cancel the current download */
    private modelDownloadExecutor: DownloadTaskExecutor | null = null;

    public readonly state = observable<OnboardingStateShape>({
        step: 1,
        isBusy: false,
        error: undefined,
        recoveryCode: '',
        practiceLanguages: [], // Will be set in constructor
    });

    public constructor(
        private readonly recoveryKit: RecoveryKit,
        private readonly logger: AppLogger,
        private readonly appConfig: AppConfig,
        private readonly localization: Localization,
        private readonly registry: Registry,
        private readonly masterKeyVault: MasterKeyVault,
        private readonly startupOrchestrator: StartupOrchestrator,
        private readonly voiceCalibrator: VoiceCalibrator,
    ) {
        // Initialize practiceLanguages here where Container is safe to access
        this.state.practiceLanguages.set([Container.get(Localization).getLocale()]);
    }

    public async calibrateVoice(): Promise<void> {
        this.logger.debug('[OnboardingState] calibrateVoice', { hasPendingTherapist: this.pendingTherapist != null });

        // ensure the speaker model is ready before recording; the UI should
        // already disable buttons when download is in progress, so at this
        // point we simply bail out if it's still downloading. callers can't
        // meaningfully calibrate without the model anyway.
        if (this.isSpeakerModelDownloading.get()) {
            // shouldn't happen since button should be hidden, but bail out gently
            return;
        }

        await this.runAsyncAction(
            async () => {
                const therapist = this.pendingTherapist;
                if (!therapist) {
                    throw new Error('Pending therapist missing during calibration');
                }

                this.logger.debug('[OnboardingState] calibrateVoice masterKeyVault load', {
                    therapistUuid: therapist.uuid,
                });
                const masterKey = await this.masterKeyVault.load(therapist.uuid);
                this.logger.debug('[OnboardingState] ProjectionMatrixFactory create', {
                    therapistUuid: therapist.uuid,
                });
                const projectionFactory = new ProjectionMatrixFactory(
                    new CryptoEngine(),
                    this.appConfig.projectionSalt,
                );
                const projectionMatrix = projectionFactory.create(masterKey);
                this.logger.debug('[OnboardingState] calibrateVoice run', { therapistUuid: therapist.uuid });
                const biocode = await this.voiceCalibrator.run(
                    projectionMatrix,
                    this.appConfig.voiceCalibrationDurationMs,
                );

                therapist.biocode = biocode.projectedVector;
                this.state.step.set(4);
                this.logger.debug('[OnboardingState] calibrateVoice success', { step: 4 });
            },
            () => {
                const ll = this.localization.getLL();
                return ll.onboarding.errorVoiceCalibration();
            },
        );
    }

    public async copyRecoveryCodeToClipboard(): Promise<void> {
        const code = this.state.recoveryCode.get();
        this.logger.debug('[OnboardingState] copyRecoveryCodeToClipboard', {
            hasCode: !!code,
            codeLength: code?.length ?? 0,
        });
        if (!code) {
            return;
        }
        await this.recoveryKit.copyToClipboard(code);
    }

    public async finalize(recoveryCodeSaveConfirmed: boolean): Promise<void> {
        this.logger.debug('[OnboardingState] finalize', {
            recoveryCodeSaveConfirmed,
            hasPendingTherapist: this.pendingTherapist != null,
        });
        const ll = this.localization.getLL();
        this.state.error.set(undefined);
        if (!recoveryCodeSaveConfirmed) {
            this.state.error.set(ll.onboarding.errorConfirmSaveCode());
            this.logger.debug('[OnboardingState] finalize aborted', { reason: 'recoveryCodeSaveConfirmed false' });
            return;
        }
        const therapist = this.pendingTherapist;
        if (!therapist) {
            this.state.error.set(ll.onboarding.errorSessionLost());
            this.logger.debug('[OnboardingState] finalize aborted', { reason: 'no pendingTherapist' });
            return;
        }
        try {
            const repo = await this.registry.getRepository(Therapist);
            await repo.persist(therapist);
            this.startupOrchestrator.run();
            this.logger.debug('[OnboardingState] finalize success');
        } catch (error: unknown) {
            this.logger.debug('[OnboardingState] finalize persist failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.state.error.set(error instanceof Error ? error.message : ll.onboarding.errorSaveAccount());
        }
    }

    public async generateAndShareRecoveryKit(): Promise<void> {
        const code = this.state.recoveryCode.get();
        this.logger.debug('[OnboardingState] generateAndShareRecoveryKit', { hasCode: !!code });
        const ll = this.localization.getLL();
        this.state.error.set(undefined);
        Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Pending, ll.recoveryKit.generatingPdf());
        if (!code) {
            this.state.error.set(ll.onboarding.errorNoRecoveryCode());
            Container.get(GlobalActivityStatus).reset();
            return;
        }
        try {
            const uri = await this.recoveryKit.generatePdf(code);
            await this.recoveryKit.share(uri);
            Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Success, ll.recoveryKit.saved());
            this.logger.debug('[OnboardingState] generateAndShareRecoveryKit success');
            Container.get(GlobalActivityStatus).reset();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : ll.recoveryKit.errorGeneric();
            this.logger.error('[OnboardingState] generateAndShareRecoveryKit failed', { error, message });
            this.state.error.set(message);
            Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Error, message);
        }
    }

    public getProfileStepValidation(data: ProfileStepData): ValidationResult {
        const validator = new FormValidator();
        const result = validator.validateProfile(data);
        this.logger.debug('[OnboardingState] getProfileStepValidation', {
            success: result.success,
            ...(result.success === false && { errorKeys: Object.keys(result.errors.fieldErrors) }),
        });
        return result;
    }

    public goToStep(step: number): void {
        this.logger.debug('[OnboardingState] goToStep', { step, stepBefore: this.state.step.get() });
        this.state.error.set(undefined);
        this.state.step.set(step);

        // when user lands on the voice calibration step start the model check/download
        if (step === 3) {
            // kick off but don't await; suppress unhandled-rejection warning
            this.ensureSpeakerModel().catch(() => {
                // intentionally ignore errors here; they will surface in global status
            });
        }
    }

    public reset(): void {
        this.logger.debug('[OnboardingState] reset', { stepBefore: this.state.step.get() });
        this.state.step.set(1);
        this.state.error.set(undefined);
        this.state.recoveryCode.set('');
        this.state.isBusy.set(false);
        this.state.practiceLanguages.set([Container.get(Localization).getLocale()]);
        Container.get(GlobalActivityStatus).reset();
        this.pendingTherapist = null;

        // clear any model download tracking state as well
        if (this.modelDownloadExecutor?.isDownloading()) {
            // if a download is in-flight, cancel it to avoid orphaned activity
            this.modelDownloadExecutor.cancel();
        }
        this.isSpeakerModelDownloading.set(false);
        this.speakerModelProgress.set(0);
        this.isSpeakerModelReady.set(false);
        this.modelDownloadExecutor = null;
    }

    public async submit(data: OnboardingFormData): Promise<void> {
        this.logger.debug('[OnboardingState] submit', { stepBefore: this.state.step.get(), data });
        const practiceLanguages = this.state.practiceLanguages.get() ?? [];
        await this.runAsyncAction(
            async () => {
                const input = this.buildAccountInput(data, practiceLanguages);
                const crypto = new CryptoEngine();
                const recovery = new RecoveryCode();
                const forge = new TherapistForge(crypto, recovery);
                const { therapist, artifacts } = forge.create(input);
                await Container.get(MasterKeyVault).save(therapist.uuid, artifacts.masterKey);
                this.pendingTherapist = therapist;
                this.state.recoveryCode.set(artifacts.recoveryCode);
                this.state.step.set(3);
                this.logger.debug('[OnboardingState] submit success', {
                    step: 3,
                    recoveryCodeLength: artifacts.recoveryCode?.length ?? 0,
                });

                // once we’re on step 3 kick off model availability check
                this.ensureSpeakerModel().catch(() => {
                    // errors are handled internally, nothing to do
                });
            },
            () => {
                const ll = Container.get(Localization).getTranslationFunctions(Container.get(Localization).getLocale());
                return ll.onboarding.errorAccountCreation();
            },
        );
    }

    private buildAccountInput(data: OnboardingFormData, practiceLanguagesFallback: string[]): CreateTherapistInput {
        const languages =
            Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : practiceLanguagesFallback;
        return {
            email: data.email,
            password: data.password,
            languages,
            qualifications: Array.isArray(data.qualifications) ? data.qualifications : [],
            experience: String(data.experience ?? '').trim(),
            methods: Array.isArray(data.methods) ? data.methods : [],
        };
    }

    /**
     * Centralizes isBusy toggling and try/catch error handling for async actions.
     * Clears error before run; on catch sets error via getErrorMessage (or default).
     */
    private async runAsyncAction(
        action: () => Promise<void>,
        getErrorMessage?: (error: unknown) => string,
    ): Promise<void> {
        this.state.error.set(undefined);
        this.state.isBusy.set(true);
        try {
            await action();
        } catch (error: unknown) {
            this.logger.debug('[OnboardingState] runAsyncAction caught', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            const message = getErrorMessage
                ? getErrorMessage(error)
                : error instanceof Error
                  ? error.message
                  : String(error);
            this.state.error.set(message);
        } finally {
            this.state.isBusy.set(false);
        }
    }

    /**
     * Guarantee that the speaker identification model is available locally.
     *
     * - if a copy already exists nothing happens
     * - otherwise a download is started (or the existing executor reused) and
     *   progress/state events drive `isSpeakerModelDownloading` and the
     *   global activity status, matching StartupOrchestrator behaviour.
     *
     * This method resolves once the model is ready or rejects if the download
     * fails.
     */
    private async ensureSpeakerModel(): Promise<void> {
        // quickly bail if we already flagged readiness
        if (this.isSpeakerModelReady.get()) {
            return;
        }

        const ll = this.localization.getLL();
        const downloader = Container.get(InferenceModelDownloader);

        // check local path first (fast, synchronous)
        const existing = downloader.getLocalPath('speaker_id');
        if (existing) {
            this.isSpeakerModelReady.set(true);
            return;
        }

        // not present: start or obtain existing executor
        try {
            this.isSpeakerModelDownloading.set(true);
            Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Pending, ll.download.speakerModel());

            const executor = await downloader.download('speaker_id');
            // remember in case we need to cancel or inspect later
            this.modelDownloadExecutor = executor;

            // update progress observable / global status
            executor.progress$.onChange(({ value: progress }) => {
                this.speakerModelProgress.set(progress);
                const percentage = Math.round(progress);
                const message = `${ll.download.speakerModel()} ${percentage}%`;
                Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Pending, message);
            });

            const completeHandler = () => {
                // model arrived
                this.isSpeakerModelReady.set(true);
                this.isSpeakerModelDownloading.set(false);

                const successFn = () => {
                    Container.get(GlobalActivityStatus).setStatus(
                        ActivityStatus.Success,
                        ll.download.speakerModelSuccess(),
                        undefined,
                        3000,
                    );
                };

                // just fire success; no startup delay to consider here
                successFn();
            };

            executor.state$.onChange(({ value: state }) => {
                if (state === DownloadState.Completed) {
                    completeHandler();
                } else if (state === DownloadState.Failed || state === DownloadState.Cancelled) {
                    Container.get(AppLogger).error('Speaker model download failed', {
                        error: executor.getError(),
                    });
                    Container.get(GlobalActivityStatus).setStatus(
                        ActivityStatus.Error,
                        ll.download.speakerModelError(),
                    );
                    this.isSpeakerModelDownloading.set(false);
                }
            });

            // handle case executor already terminal
            const initialState = executor.getState();
            if (initialState === DownloadState.Completed) {
                completeHandler();
            } else if (initialState === DownloadState.Failed || initialState === DownloadState.Cancelled) {
                Container.get(AppLogger).error('Speaker model download failed', {
                    error: executor.getError(),
                });
                Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Error, ll.download.speakerModelError());
                this.isSpeakerModelDownloading.set(false);
            }

            // finally await for the executor to finish so callers can
            // `await ensureSpeakerModel()` if needed
            await new Promise<void>((resolve, reject) => {
                executor.state$.onChange(({ value: state }) => {
                    if (state === DownloadState.Completed) {
                        resolve();
                    }
                    if (state === DownloadState.Failed || state === DownloadState.Cancelled) {
                        reject(executor.getError());
                    }
                });
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            Container.get(AppLogger).error('Speaker model download failed', {
                error: errorMsg,
                errorDetails: err instanceof Error ? err.stack : undefined,
            });
            Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Error, ll.download.speakerModelError());
            this.isSpeakerModelDownloading.set(false);
            throw err;
        }
    }
}

Container.register(OnboardingState, () => {
    const logger = Container.get(AppLogger);

    return new OnboardingState(
        new RecoveryKit(logger),
        logger,
        Container.get(AppConfig),
        Container.get(Localization),
        Container.get(Registry),
        Container.get(MasterKeyVault),
        Container.get(StartupOrchestrator),
        Container.get(VoiceCalibrator),
    );
});
