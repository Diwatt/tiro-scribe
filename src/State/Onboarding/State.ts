/**
 * OnboardingState – ViewModel for the onboarding wizard. Orchestrates flow via Entity (Therapist),
 * Database (registry), and Service (VoiceCalibrator). Manages observables and RecoveryKit (UI-bound).
 */

import { computed, type ObservableComputed, observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import type { Therapist } from '@/Entity/Therapist';
import { type AccountCreationResult, AccountState } from './AccountState';
import { ProfileState } from './ProfileState';
import { RecoveryState } from './RecoveryState';
import { OnboardingStep, type PendingTherapistProvider } from './Types';
import { VoiceState } from './VoiceState';

/** Re-export for consumers. */
export type { OnboardingStep, PendingTherapistProvider, ValidationResult } from './Types';

/** Number of steps in the onboarding wizard (progress UI). */
export const ONBOARDING_STEPS = Object.keys(OnboardingStep).length / 2; // enum has both keys and values

export class OnboardingState implements PendingTherapistProvider {
    public readonly step = observable<OnboardingStep>(OnboardingStep.Account);

    // aggregated values derived from the child states
    public readonly error: ObservableComputed<string | undefined>;
    public readonly isBusy: ObservableComputed<boolean>;

    public readonly account: AccountState;
    public readonly profile: ProfileState;
    public readonly voice: VoiceState;
    public readonly recovery: RecoveryState;

    private readonly pendingTherapist = observable<Therapist | null>(null);
    private readonly logger: AppLogger;

    public constructor(
        account: AccountState,
        profile: ProfileState,
        voice: VoiceState,
        recovery: RecoveryState,
        logger: AppLogger,
    ) {
        this.account = account;
        this.profile = profile;
        this.voice = voice;
        this.recovery = recovery;
        this.logger = logger;

        // aggregate values that depend on all children
        const children = [this.account, this.profile, this.voice, this.recovery] as const;
        this.error = computed(() => {
            for (const s of children) {
                const e = s.error.get();
                if (e) {
                    return e;
                }
            }
            return undefined;
        });
        this.isBusy = computed(() => children.some((s) => s.isBusy.get()));

        // remaining wiring
        this.setupBindings();
    }

    /**
     * Implements PendingTherapistProvider contract.
     */
    public getPendingTherapist(): Therapist | null {
        return this.pendingTherapist.get();
    }

    public goToStep(step: OnboardingStep): void {
        this.logger.debug('[OnboardingState] goToStep', { step, stepBefore: this.step.get() });
        this.step.set(step);
        if (step === OnboardingStep.Voice) {
            this.voice.ensureSpeakerModel().catch(() => {
                // swallow; voice state already updates global activity status
            });
        }
    }

    public reset(): void {
        this.logger.debug('[OnboardingState] reset', { stepBefore: this.step.get() });
        this.step.set(OnboardingStep.Account);
        this.pendingTherapist.set(null);
        this.account.reset();
        this.profile.reset();
        this.voice.reset();
        this.recovery.reset();
    }

    public handleAccountSuccess(result: AccountCreationResult): void {
        this.pendingTherapist.set(result.therapist);
        this.recovery.recoveryCode.set(result.recoveryCode);
        this.step.set(OnboardingStep.Voice);
        this.voice.ensureSpeakerModel().catch(() => {
            // errors are surfaced by the voice state itself
        });
    }

    /**
     * Helper that attaches event handlers to every sub‑state in a consistent way.
     * Pulling this out keeps the constructor lean and improves readability.
     */
    private setupBindings(): void {
        // callbacks that depend on `this`
        this.account.setOnSuccess(this.handleAccountSuccess.bind(this));
        this.voice.setPendingTherapistProvider(this);
        // NOTE: Recovery step is temporarily disabled. After successful calibration we finalize onboarding directly.
        this.voice.setOnCalibrationSuccess(() => {
            this.recovery.finalize(true).catch(() => {
                // swallow; nothing actionable here during onboarding flow
            });
        });
        this.recovery.setPendingTherapistProvider(this);

        // nothing else to wire at the root level any more
    }
}

Container.register(OnboardingState, () => {
    const logger = Container.get(AppLogger);
    const account = Container.get(AccountState);
    const profile = Container.get(ProfileState);
    const voice = Container.get(VoiceState);
    const recovery = Container.get(RecoveryState);

    // sub‑states are already wired by the OnboardingState constructor
    return new OnboardingState(account, profile, voice, recovery, logger);
});
