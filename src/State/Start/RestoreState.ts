/**
 * RestoreState – ViewModel for the vault restore (recovery-kit path).
 * Scope: a Therapist row present on this device while the master key is
 * missing from SecureStore (OS backup restore, wiped keychain). Unwraps the
 * master key with the recovery code, re-wraps it under a new password and
 * reopens the session. Cross-device restore of an encrypted bundle (DB file +
 * wrapped keys) is a separate upcoming feature, not handled here.
 */

import { observable } from '@legendapp/state';
import { AppRouter } from '@/Core/AppRouter';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Localization } from '@/Localization';
import { TherapistRepository } from '@/Repository';
import { MasterKeyVault, RecoveryCode, TherapistForge } from '@/Security';
import { AbstractState } from '@/State/Onboarding/AbstractState';
import { StartupOrchestrator } from '@/State/StartupOrchestrator';

export class RestoreState extends AbstractState {
    public readonly recoveryCode = observable<string>('');
    public readonly newPassword = observable<string>('');

    public constructor(
        logger: AppLogger,
        private readonly repository: TherapistRepository,
        private readonly forge: TherapistForge,
        private readonly vault: MasterKeyVault,
        private readonly startupOrchestrator: StartupOrchestrator,
        private readonly router: AppRouter,
        private readonly localization: Localization,
    ) {
        super(logger);
    }

    public async restore(): Promise<void> {
        await this.runAsyncAction(() => this.runRestore());
    }

    public reset(): void {
        super.reset();
        this.recoveryCode.set('');
        this.newPassword.set('');
    }

    private async openMainScreen(): Promise<void> {
        await this.startupOrchestrator.run();
        try {
            this.router.replace('/main');
        } catch (navError: unknown) {
            this.logger.debug('[RestoreState] navigation to /main failed', { navError });
        }
        this.logger.debug('[RestoreState] restore success');
    }

    /** Unwraps the master key and opens the session; false (with the error set) when the restore cannot proceed. */
    private async restoreSession(): Promise<boolean> {
        const ll = this.localization.getLL();
        const therapist = await this.repository.findCurrent();
        if (therapist == null) {
            this.error.set(ll.restoreVault.errorNoVault());

            return false;
        }

        let masterKey: string;
        try {
            masterKey = this.forge.recover(
                therapist,
                RecoveryCode.canonicalize(this.recoveryCode.get()),
                this.newPassword.get(),
            );
        } catch (error: unknown) {
            // A wrong recovery code fails the GCM integrity check inside decrypt.
            this.logger.debug('[RestoreState] recovery code rejected', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.error.set(ll.restoreVault.errorInvalidCode());

            return false;
        }

        try {
            await this.repository.persist(therapist);
            await this.vault.save(therapist.getUuid(), masterKey);
        } catch (error: unknown) {
            this.logger.error('[RestoreState] restore persistence failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.error.set(ll.restoreVault.errorGeneric());

            return false;
        }

        return true;
    }

    private async runRestore(): Promise<void> {
        this.error.set(undefined);
        if (!(await this.restoreSession())) {
            return;
        }

        await this.openMainScreen();
    }
}

Container.register(RestoreState, () => {
    const logger = Container.get(AppLogger);
    const repository = Container.get(TherapistRepository);
    const forge = Container.get(TherapistForge);
    const vault = Container.get(MasterKeyVault);
    const startupOrchestrator = Container.get(StartupOrchestrator);
    const router = Container.get(AppRouter);
    const localization = Container.get(Localization);

    return new RestoreState(logger, repository, forge, vault, startupOrchestrator, router, localization);
});
