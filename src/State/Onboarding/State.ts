/**
 * OnboardingState – ViewModel for the onboarding wizard. Orchestrates flow via Entity (Therapist),
 * Database (registry), and Service (VoiceCalibrator). Manages observables and RecoveryKit (UI-bound).
 */

import { observable } from '@legendapp/state';
import { Container, type LoggerInterface } from '@/Container';
import { Registry } from '@/Database/Registry';
import { AppLanguage } from '@/Localization/AppLanguage';
import { ProjectionMatrixFactory } from '@/Math/ProjectionMatrixFactory';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { VoiceCalibrator } from '@/Service';
import { GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { StartupOrchestrator } from '@/State/StartupOrchestrator';
import { Therapist } from '../../Entity/Therapist';
import { CryptoEngine, RecoveryCode, type RecoveryKit } from '../../Security';
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

    public readonly state = observable<OnboardingStateShape>({
        step: 1,
        isBusy: false,
        error: undefined,
        recoveryCode: '',
        practiceLanguages: [], // Will be set in constructor
    });

    public constructor(
        private readonly recoveryKit: RecoveryKit,
        private readonly logger: LoggerInterface,
    ) {
        // Initialize practiceLanguages here where Container is safe to access
        this.state.practiceLanguages.set([Container.get(AppLanguage).getLocale()]);
    }

    public async calibrateVoice(): Promise<void> {
        this.logger.debug('[OnboardingState] calibrateVoice', { hasPendingTherapist: this.pendingTherapist != null });
        await this.runAsyncAction(
            async () => {
                const therapist = this.pendingTherapist;
                if (!therapist) {
                    throw new Error('Pending therapist missing during calibration');
                }

                const masterKey = await Container.get(MasterKeyVault).load(therapist.uuid);
                const projectionFactory = new ProjectionMatrixFactory(new CryptoEngine());
                const projectionMatrix = projectionFactory.create(masterKey);
                const biocode = await Container.get(VoiceCalibrator).run(projectionMatrix);

                therapist.biocode = biocode.projectedVector;
                this.state.step.set(4);
                this.logger.debug('[OnboardingState] calibrateVoice success', { step: 4 });
            },
            () => {
                const ll = Container.get(AppLanguage).getTranslationFunctions(Container.get(AppLanguage).getLocale());
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
        const ll = Container.get(AppLanguage).getTranslationFunctions(Container.get(AppLanguage).getLocale());
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
            const repo = await Container.get(Registry).getRepository(Therapist);
            await repo.persist(therapist);
            Container.get(StartupOrchestrator).run();
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
        const ll = Container.get(AppLanguage).getTranslationFunctions(Container.get(AppLanguage).getLocale());
        this.state.error.set(undefined);
        Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Pending, ll.recoveryKit.generatingPdf());
        if (!code) {
            this.state.error.set(ll.onboarding.errorNoRecoveryCode());
            Container.get(GlobalActivityStatus).reset('recoveryKit');
            return;
        }
        try {
            const uri = await this.recoveryKit.generatePdf(code);
            await this.recoveryKit.share(uri);
            Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Success, ll.recoveryKit.saved());
            this.logger.debug('[OnboardingState] generateAndShareRecoveryKit success');
            Container.get(GlobalActivityStatus).reset('recoveryKit');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : ll.recoveryKit.errorGeneric();
            this.logger.error('[OnboardingState] generateAndShareRecoveryKit failed', { error, message });
            this.state.error.set(message);
            Container.get(GlobalActivityStatus).setStatus(ActivityStatus.Error, message);
        }
    }

    public getProfileStepValidation(data: ProfileStepData): ValidationResult {
        const result = Container.get(FormValidator).validateProfile(data);
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
    }

    public reset(): void {
        this.logger.debug('[OnboardingState] reset', { stepBefore: this.state.step.get() });
        this.state.step.set(1);
        this.state.error.set(undefined);
        this.state.recoveryCode.set('');
        this.state.isBusy.set(false);
        this.state.practiceLanguages.set([Container.get(AppLanguage).getLocale()]);
        Container.get(GlobalActivityStatus).reset('recoveryKit');
        this.pendingTherapist = null;
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
            },
            () => {
                const ll = Container.get(AppLanguage).getTranslationFunctions(Container.get(AppLanguage).getLocale());
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
}

Container.register(OnboardingState, () => new OnboardingState(Container.get(MasterKeyVault), AppLogger.getInstance()));
