/**
 * OnboardingState – Orchestrates the onboarding wizard: steps, submit, voice calibration, recovery, finalize.
 *
 * Recovery code flow: TherapistVault (Security) creates the code on submit(); we keep it in state$
 * only for the duration of the recovery step so the UI can show it and offer copy/share. When the
 * user taps "Save Recovery Kit", we pass that code to RecoveryKit (Security), which generates the
 * PDF and opens the share sheet. State does not handle the document itself—only wizard state and
 * UI feedback (isBusy, error). Recovery kit status is in AppAsyncStatus and drives AsyncButton.
 */

import { observable } from '@legendapp/state';
import { registry } from '../../Database/Registry';
import { Therapist } from '../../Entity/Therapist';
import { RecoveryKit, TherapistVault } from '../../Security';
import { voiceCalibration } from '../../Service';
import { AppLogger } from '../../Service/Logger';
import { startupOrchestrator } from '../StartupOrchestrator';
import Toast from 'react-native-toast-message';
import { AsyncStatus, appAsyncStatus } from '../AppAsyncStatus';
import type { OnboardingFormData, ProfileStepData } from './Schema';
import { profileSchema } from './Schema';

const RECOVERY_KIT_SUCCESS_RESET_MS = 3000;

export type ProfileValidationResult = { success: true } | { success: false; errors: Record<string, string> };

const logger = AppLogger.getInstance();

export type OnboardingStateShape = {
    step: number;
    isBusy: boolean;
    error: string | undefined;
    recoveryCode: string;
};

export class OnboardingState {
    public readonly state$ = observable<OnboardingStateShape>({
        step: 1,
        isBusy: false,
        error: undefined,
        recoveryCode: '',
    });

    /** Injected: Security layer generates and shares the PDF; we only pass the code we hold for this step. */
    private readonly recoveryKit: RecoveryKit;

    /** Set after submit(), used by calibrate() and finalize(), cleared on reset(). */
    private pendingTherapist: Therapist | null = null;

    public constructor(recoveryKit: RecoveryKit) {
        this.recoveryKit = recoveryKit;
    }

    public async submit(data: OnboardingFormData): Promise<void> {
        this.state$.error.set(undefined);
        this.state$.isBusy.set(true);
        try {
            const { therapist, recoveryCode } = await TherapistVault.createAccount(data.email, data.password, null, data.languages);
            therapist.setQualification(data.qualifications.length > 0 ? data.qualifications.join(',') : null);
            therapist.setYearsOfExperience(parseInt(data.experience, 10));
            therapist.setTherapyMethod(data.methods.length > 0 ? data.methods.join(',') : null);
            this.pendingTherapist = therapist;
            this.state$.recoveryCode.set(recoveryCode);
            this.state$.step.set(3);
        } catch (error: unknown) {
            this.state$.error.set(error instanceof Error ? error.message : 'Account creation failed.');
        } finally {
            this.state$.isBusy.set(false);
        }
    }

    public async calibrateVoice(): Promise<void> {
        this.state$.error.set(undefined);
        this.state$.isBusy.set(true);
        try {
            const vector = await voiceCalibration.run();
            if (this.pendingTherapist) {
                this.pendingTherapist.setBiocodeEmbedding(vector);
            }
            this.state$.step.set(4);
        } catch (error: unknown) {
            this.state$.error.set(error instanceof Error ? error.message : 'Voice calibration failed.');
        } finally {
            this.state$.isBusy.set(false);
        }
    }

    public finalize(savedCodeChecked: boolean): void {
        this.state$.error.set(undefined);
        if (!savedCodeChecked) {
            this.state$.error.set('Please confirm you have saved your recovery code.');
            return;
        }
        const therapist = this.pendingTherapist;
        if (!therapist) {
            this.state$.error.set('Session lost. Please start over.');
            return;
        }
        try {
            const repo = registry.getRepository(Therapist);
            repo.persist(therapist);
            startupOrchestrator.run();
        } catch (error: unknown) {
            this.state$.error.set(error instanceof Error ? error.message : 'Failed to save account.');
        }
    }

    public goToStep(step: number): void {
        this.state$.error.set(undefined);
        this.state$.step.set(step);
    }

    /**
     * Returns a validation result for profile step data: either { success: true } or
     * { success: false, errors: Record<fieldKey, message> } for the view to apply.
     */
    public getProfileStepValidation(data: ProfileStepData): ProfileValidationResult {
        const result = profileSchema.safeParse(data);
        if (result.success) {
            return { success: true };
        }
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
            const key = issue.path[0];
            if (typeof key === 'string') {
                errors[key] = issue.message;
            }
        });
        return { success: false, errors };
    }

    public reset(): void {
        this.state$.step.set(1);
        this.state$.error.set(undefined);
        this.state$.recoveryCode.set('');
        this.state$.isBusy.set(false);
        appAsyncStatus.reset(appAsyncStatus.recoveryKitStatusKey);
        this.pendingTherapist = null;
    }

    /**
     * Copies the current recovery code to the system clipboard.
     * View is responsible for showing "copied" feedback (e.g. Snackbar).
     */
    public async copyRecoveryCodeToClipboard(): Promise<void> {
        const code = this.state$.recoveryCode.get();
        if (!code) {
            return;
        }
        await this.recoveryKit.copyToClipboard(code);
    }

    /**
     * Generates a PDF Recovery Kit and opens the OS share sheet.
     * Updates AppAsyncStatus (pending → success | error); resets to idle 3s after success.
     */
    public async generateAndShareRecoveryKit(): Promise<void> {
        this.state$.error.set(undefined);
        appAsyncStatus.setStatus(appAsyncStatus.recoveryKitStatusKey, AsyncStatus.Pending);
        const code = this.state$.recoveryCode.get();
        if (!code) {
            this.state$.error.set('No recovery code available.');
            appAsyncStatus.reset(appAsyncStatus.recoveryKitStatusKey);
            return;
        }
        try {
            const uri = await this.recoveryKit.generatePdf(code);
            await this.recoveryKit.share(uri);
            appAsyncStatus.setStatus(appAsyncStatus.recoveryKitStatusKey, AsyncStatus.Success);
            Toast.show({
                type: 'success',
                text1: 'Kit de secours enregistré',
                text2: 'Votre kit a été généré et partagé.',
            });
            setTimeout(() => {
                appAsyncStatus.reset(appAsyncStatus.recoveryKitStatusKey);
            }, RECOVERY_KIT_SUCCESS_RESET_MS);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to generate or share recovery kit.';
            logger.error('[OnboardingState] generateAndShareRecoveryKit failed', { error, message });
            this.state$.error.set(message);
            appAsyncStatus.setStatus(appAsyncStatus.recoveryKitStatusKey, AsyncStatus.Error);
            Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: message,
            });
        }
    }
}

export const onboardingState = new OnboardingState(new RecoveryKit());
