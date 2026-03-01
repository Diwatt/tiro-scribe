/**
 * OnboardingState – ViewModel for the onboarding wizard. Orchestrates flow via Entity (Therapist),
 * Database (registry), and Service (VoiceCalibrator). Manages observables and RecoveryKit (UI-bound).
 */

import { observable } from '@legendapp/state';
import { registry } from '../../Database/Registry';
import { Therapist } from '../../Entity/Therapist';
import { appLanguage } from '../../Localization/AppLanguage';
import { CryptoEngine, masterKeyVault, RecoveryCode, RecoveryKit } from '../../Security';
import type { CreateTherapistInput } from '../../Security/TherapistForge';
import { TherapistForge } from '../../Security/TherapistForge';
import { appLogger } from '../../Service/Logger';
import { voiceCalibrator } from '../../Service/SpeakerId/VoiceCalibrator';
import { ActivityStatus, globalActivityStatus } from '../GlobalActivityStatus';
import { startupOrchestrator } from '../StartupOrchestrator';
import type { ProfileStepData } from './FormValidator';
import { formValidator } from './FormValidator';
import type { OnboardingFormData } from './Schema';
import type { ValidationResult } from './Types';

/** Re-export for consumers. */
export type { ValidationResult } from './Types';

/** Number of steps in the onboarding wizard (progress UI). */
export const ONBOARDING_STEPS = 4;

const LOGGER = appLogger;

export type OnboardingStateShape = {
    step: number;
    isBusy: boolean;
    error: string | undefined;
    recoveryCode: string;
    practiceLanguages: string[];
};

export class OnboardingState {
    private pendingTherapist: Therapist | null = null;

    private readonly recoveryKit: RecoveryKit;
    public readonly state$ = observable<OnboardingStateShape>({
        step: 1,
        isBusy: false,
        error: undefined,
        recoveryCode: '',
        practiceLanguages: [appLanguage.getLocale()],
    });

    public constructor(recoveryKit: RecoveryKit) {
        this.recoveryKit = recoveryKit;
    }

    public async calibrateVoice(): Promise<void> {
        LOGGER.debug('[OnboardingState] calibrateVoice', { hasPendingTherapist: this.pendingTherapist != null });
        await this.runAsyncAction(
            async () => {
                const _vector = await voiceCalibrator.run();
                // embedding is no longer stored in Therapist for privacy
                // any client using the vector should handle it in-memory
                this.state$.step.set(4);
                LOGGER.debug('[OnboardingState] calibrateVoice success', { step: 4 });
            },
            () => {
                const ll = appLanguage.getTranslationFunctions(appLanguage.getLocale());
                return ll.onboarding.errorVoiceCalibration();
            },
        );
    }

    public async copyRecoveryCodeToClipboard(): Promise<void> {
        const code = this.state$.recoveryCode.get();
        LOGGER.debug('[OnboardingState] copyRecoveryCodeToClipboard', {
            hasCode: !!code,
            codeLength: code?.length ?? 0,
        });
        if (!code) {
            return;
        }
        await this.recoveryKit.copyToClipboard(code);
    }

    public async finalize(recoveryCodeSaveConfirmed: boolean): Promise<void> {
        LOGGER.debug('[OnboardingState] finalize', {
            recoveryCodeSaveConfirmed,
            hasPendingTherapist: this.pendingTherapist != null,
        });
        const ll = appLanguage.getTranslationFunctions(appLanguage.getLocale());
        this.state$.error.set(undefined);
        if (!recoveryCodeSaveConfirmed) {
            this.state$.error.set(ll.onboarding.errorConfirmSaveCode());
            LOGGER.debug('[OnboardingState] finalize aborted', { reason: 'recoveryCodeSaveConfirmed false' });
            return;
        }
        const therapist = this.pendingTherapist;
        if (!therapist) {
            this.state$.error.set(ll.onboarding.errorSessionLost());
            LOGGER.debug('[OnboardingState] finalize aborted', { reason: 'no pendingTherapist' });
            return;
        }
        try {
            const repo = await registry.getRepository(Therapist);
            await repo.persist(therapist);
            startupOrchestrator.run();
            LOGGER.debug('[OnboardingState] finalize success');
        } catch (error: unknown) {
            LOGGER.debug('[OnboardingState] finalize persist failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.state$.error.set(error instanceof Error ? error.message : ll.onboarding.errorSaveAccount());
        }
    }

    public async generateAndShareRecoveryKit(): Promise<void> {
        const code = this.state$.recoveryCode.get();
        LOGGER.debug('[OnboardingState] generateAndShareRecoveryKit', { hasCode: !!code });
        const ll = appLanguage.getTranslationFunctions(appLanguage.getLocale());
        this.state$.error.set(undefined);
        globalActivityStatus.setStatus(ActivityStatus.Pending, ll.recoveryKit.generatingPdf());
        if (!code) {
            this.state$.error.set(ll.onboarding.errorNoRecoveryCode());
            globalActivityStatus.reset('recoveryKit');
            return;
        }
        try {
            const uri = await this.recoveryKit.generatePdf(code);
            await this.recoveryKit.share(uri);
            globalActivityStatus.setStatus(ActivityStatus.Success, ll.recoveryKit.saved());
            LOGGER.debug('[OnboardingState] generateAndShareRecoveryKit success');
            globalActivityStatus.reset('recoveryKit');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : ll.recoveryKit.errorGeneric();
            LOGGER.error('[OnboardingState] generateAndShareRecoveryKit failed', { error, message });
            this.state$.error.set(message);
            globalActivityStatus.setStatus(ActivityStatus.Error, message);
        }
    }

    public getProfileStepValidation(data: ProfileStepData): ValidationResult {
        const result = formValidator.validateProfile(data);
        LOGGER.debug('[OnboardingState] getProfileStepValidation', {
            success: result.success,
            ...(result.success === false && { errorKeys: Object.keys(result.errors.fieldErrors) }),
        });
        return result;
    }

    public goToStep(step: number): void {
        LOGGER.debug('[OnboardingState] goToStep', { step, stepBefore: this.state$.step.get() });
        this.state$.error.set(undefined);
        this.state$.step.set(step);
    }

    public reset(): void {
        LOGGER.debug('[OnboardingState] reset', { stepBefore: this.state$.step.get() });
        this.state$.step.set(1);
        this.state$.error.set(undefined);
        this.state$.recoveryCode.set('');
        this.state$.isBusy.set(false);
        this.state$.practiceLanguages.set([appLanguage.getLocale()]);
        globalActivityStatus.reset('recoveryKit');
        this.pendingTherapist = null;
    }

    public async submit(data: OnboardingFormData): Promise<void> {
        LOGGER.debug('[OnboardingState] submit', { stepBefore: this.state$.step.get(), data });
        const practiceLanguages = this.state$.practiceLanguages.get() ?? [];
        await this.runAsyncAction(
            async () => {
                const input = this.buildAccountInput(data, practiceLanguages);
                const crypto = new CryptoEngine();
                const recovery = new RecoveryCode();
                const forge = new TherapistForge(crypto, recovery);
                const { therapist, artifacts } = forge.create(input);
                await masterKeyVault.save(therapist.uuid, artifacts.masterKey);
                this.pendingTherapist = therapist;
                this.state$.recoveryCode.set(artifacts.recoveryCode);
                this.state$.step.set(3);
                LOGGER.debug('[OnboardingState] submit success', {
                    step: 3,
                    recoveryCodeLength: artifacts.recoveryCode?.length ?? 0,
                });
            },
            () => {
                const ll = appLanguage.getTranslationFunctions(appLanguage.getLocale());
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
        this.state$.error.set(undefined);
        this.state$.isBusy.set(true);
        try {
            await action();
        } catch (error: unknown) {
            LOGGER.debug('[OnboardingState] runAsyncAction caught', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            const message = getErrorMessage
                ? getErrorMessage(error)
                : error instanceof Error
                  ? error.message
                  : String(error);
            this.state$.error.set(message);
        } finally {
            this.state$.isBusy.set(false);
        }
    }
}

export const onboardingState = new OnboardingState(new RecoveryKit());
