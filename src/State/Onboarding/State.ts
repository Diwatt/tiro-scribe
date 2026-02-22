/**
 * OnboardingState – ViewModel for the onboarding wizard. Orchestrates flow via Entity (Therapist),
 * Database (registry), and Service (VoiceCalibration). Manages observables and RecoveryKit (UI-bound).
 */

import { observable } from '@legendapp/state';
import { registry } from '../../Database/Registry';
import { Therapist } from '../../Entity/Therapist';
import { AppLanguage } from '../../Localization/AppLanguage';
import { CryptoEngine, masterKeyVault, RecoveryCode, RecoveryKit } from '../../Security';
import type { CreateTherapistInput } from '../../Security/TherapistForge';
import { TherapistForge } from '../../Security/TherapistForge';
import { AppLogger } from '../../Service/Logger';
import { voiceCalibration } from '../../Service/VoiceCalibration';
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

const logger = AppLogger.getInstance();

export type OnboardingStateShape = {
    step: number;
    isBusy: boolean;
    error: string | undefined;
    recoveryCode: string;
    practiceLanguages: string[];
};

export class OnboardingState {
    public readonly state$ = observable<OnboardingStateShape>({
        step: 1,
        isBusy: false,
        error: undefined,
        recoveryCode: '',
        practiceLanguages: [AppLanguage.getInstance().getLocale()],
    });

    private readonly recoveryKit: RecoveryKit;
    private pendingTherapist: Therapist | null = null;

    public constructor(recoveryKit: RecoveryKit) {
        this.recoveryKit = recoveryKit;
    }

    /**
     * Centralizes isBusy toggling and try/catch error handling for async actions.
     * Clears error before run; on catch sets error via getErrorMessage (or default).
     */
    private async runAsyncAction(action: () => Promise<void>, getErrorMessage?: (error: unknown) => string): Promise<void> {
        this.state$.error.set(undefined);
        this.state$.isBusy.set(true);
        try {
            await action();
        } catch (error: unknown) {
            logger.debug('[OnboardingState] runAsyncAction caught', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            const message = getErrorMessage ? getErrorMessage(error) : error instanceof Error ? error.message : String(error);
            this.state$.error.set(message);
        } finally {
            this.state$.isBusy.set(false);
        }
    }

    public async submit(data: OnboardingFormData): Promise<void> {
        logger.debug('[OnboardingState] submit', { stepBefore: this.state$.step.get(), data });
        const practiceLanguages = this.state$.practiceLanguages.get() ?? [];
        await this.runAsyncAction(
            async () => {
                const input = this.buildAccountInput(data, practiceLanguages);
                const crypto = new CryptoEngine();
                const recovery = new RecoveryCode();
                const { therapist, artifacts } = TherapistForge.create(input, crypto, recovery);
                await masterKeyVault.save(therapist.uuid, artifacts.masterKey);
                this.pendingTherapist = therapist;
                this.state$.recoveryCode.set(artifacts.recoveryCode);
                this.state$.step.set(3);
                logger.debug('[OnboardingState] submit success', { step: 3, recoveryCodeLength: artifacts.recoveryCode?.length ?? 0 });
            },
            () => {
                const Ll = AppLanguage.getInstance().getTranslationFunctions(AppLanguage.getInstance().getLocale());
                return Ll.onboarding.errorAccountCreation();
            },
        );
    }

    public async calibrateVoice(): Promise<void> {
        logger.debug('[OnboardingState] calibrateVoice', { hasPendingTherapist: this.pendingTherapist != null });
        await this.runAsyncAction(
            async () => {
                const vector = await voiceCalibration.run();
                if (this.pendingTherapist) {
                    this.pendingTherapist.biocodeEmbedding = vector;
                }
                this.state$.step.set(4);
                logger.debug('[OnboardingState] calibrateVoice success', { step: 4 });
            },
            () => {
                const Ll = AppLanguage.getInstance().getTranslationFunctions(AppLanguage.getInstance().getLocale());
                return Ll.onboarding.errorVoiceCalibration();
            },
        );
    }

    public async finalize(recoveryCodeSaveConfirmed: boolean): Promise<void> {
        logger.debug('[OnboardingState] finalize', {
            recoveryCodeSaveConfirmed,
            hasPendingTherapist: this.pendingTherapist != null,
        });
        const Ll = AppLanguage.getInstance().getTranslationFunctions(AppLanguage.getInstance().getLocale());
        this.state$.error.set(undefined);
        if (!recoveryCodeSaveConfirmed) {
            this.state$.error.set(Ll.onboarding.errorConfirmSaveCode());
            logger.debug('[OnboardingState] finalize aborted', { reason: 'recoveryCodeSaveConfirmed false' });
            return;
        }
        const therapist = this.pendingTherapist;
        if (!therapist) {
            this.state$.error.set(Ll.onboarding.errorSessionLost());
            logger.debug('[OnboardingState] finalize aborted', { reason: 'no pendingTherapist' });
            return;
        }
        try {
            const repo = await registry.getRepository(Therapist);
            await repo.persist(therapist);
            startupOrchestrator.run();
            logger.debug('[OnboardingState] finalize success');
        } catch (error: unknown) {
            logger.debug('[OnboardingState] finalize persist failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.state$.error.set(error instanceof Error ? error.message : Ll.onboarding.errorSaveAccount());
        }
    }

    private buildAccountInput(data: OnboardingFormData, practiceLanguagesFallback: string[]): CreateTherapistInput {
        const languages = Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : practiceLanguagesFallback;
        return {
            email: data.email,
            password: data.password,
            languages,
            qualifications: Array.isArray(data.qualifications) ? data.qualifications : [],
            experience: String(data.experience ?? '').trim(),
            methods: Array.isArray(data.methods) ? data.methods : [],
        };
    }

    public goToStep(step: number): void {
        logger.debug('[OnboardingState] goToStep', { step, stepBefore: this.state$.step.get() });
        this.state$.error.set(undefined);
        this.state$.step.set(step);
    }

    public getProfileStepValidation(data: ProfileStepData): ValidationResult {
        const result = formValidator.validateProfile(data);
        logger.debug('[OnboardingState] getProfileStepValidation', {
            success: result.success,
            ...(result.success === false && { errorKeys: Object.keys(result.errors.fieldErrors) }),
        });
        return result;
    }

    public reset(): void {
        logger.debug('[OnboardingState] reset', { stepBefore: this.state$.step.get() });
        this.state$.step.set(1);
        this.state$.error.set(undefined);
        this.state$.recoveryCode.set('');
        this.state$.isBusy.set(false);
        this.state$.practiceLanguages.set([AppLanguage.getInstance().getLocale()]);
        globalActivityStatus.reset(globalActivityStatus.recoveryKitStatusKey);
        this.pendingTherapist = null;
    }

    public async copyRecoveryCodeToClipboard(): Promise<void> {
        const code = this.state$.recoveryCode.get();
        logger.debug('[OnboardingState] copyRecoveryCodeToClipboard', {
            hasCode: !!code,
            codeLength: code?.length ?? 0,
        });
        if (!code) {
            return;
        }
        await this.recoveryKit.copyToClipboard(code);
    }

    public async generateAndShareRecoveryKit(): Promise<void> {
        const code = this.state$.recoveryCode.get();
        logger.debug('[OnboardingState] generateAndShareRecoveryKit', { hasCode: !!code });
        const Ll = AppLanguage.getInstance().getTranslationFunctions(AppLanguage.getInstance().getLocale());
        this.state$.error.set(undefined);
        globalActivityStatus.setStatus(globalActivityStatus.recoveryKitStatusKey, ActivityStatus.Pending, Ll.recoveryKit.generatingPdf());
        if (!code) {
            this.state$.error.set(Ll.onboarding.errorNoRecoveryCode());
            globalActivityStatus.reset(globalActivityStatus.recoveryKitStatusKey);
            return;
        }
        try {
            const uri = await this.recoveryKit.generatePdf(code);
            await this.recoveryKit.share(uri);
            globalActivityStatus.setStatus(globalActivityStatus.recoveryKitStatusKey, ActivityStatus.Success, Ll.recoveryKit.saved());
            logger.debug('[OnboardingState] generateAndShareRecoveryKit success');
            globalActivityStatus.reset(globalActivityStatus.recoveryKitStatusKey);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : Ll.recoveryKit.errorGeneric();
            logger.error('[OnboardingState] generateAndShareRecoveryKit failed', { error, message });
            this.state$.error.set(message);
            globalActivityStatus.setStatus(globalActivityStatus.recoveryKitStatusKey, ActivityStatus.Error, message);
        }
    }
}

export const onboardingState = new OnboardingState(new RecoveryKit());
