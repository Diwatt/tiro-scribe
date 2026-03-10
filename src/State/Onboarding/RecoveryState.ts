import { observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Registry } from '@/Database/Registry';
import { Therapist } from '@/Entity/Therapist';
import { Localization } from '@/Localization';
import { RecoveryKit } from '@/Security';
import { ActivityStatus, GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { StartupOrchestrator } from '@/State/StartupOrchestrator';
import { AbstractState } from './AbstractState';

export class RecoveryState extends AbstractState {
    public readonly recoveryCode = observable<string>('');
    private _getPendingTherapist: () => Therapist | null = () => null;

    public constructor(
        logger: AppLogger,
        private readonly recoveryKit: RecoveryKit,
        private readonly globalActivityStatus: GlobalActivityStatus,
        private readonly localization: Localization,
        private readonly registry: Registry,
        private readonly startupOrchestrator: StartupOrchestrator,
    ) {
        super(logger);
    }

    public setPendingTherapistGetter(getter: () => Therapist | null): void {
        this._getPendingTherapist = getter;
    }

    public async copyRecoveryCodeToClipboard(): Promise<void> {
        const code = this.recoveryCode.get();
        if (!code) {
            return;
        }

        await this.recoveryKit.copyToClipboard(code);
    }

    public async generateAndShareRecoveryKit(): Promise<void> {
        const code = this.recoveryCode.get();
        const ll = this.localization.getLL();
        this.error.set(undefined);
        this.globalActivityStatus.setStatus(ActivityStatus.Pending, ll.recoveryKit.generatingPdf());
        if (!code) {
            this.error.set(ll.onboarding.errorNoRecoveryCode());
            this.globalActivityStatus.reset();
            return;
        }

        try {
            const uri = await this.recoveryKit.generatePdf(code);
            await this.recoveryKit.share(uri);
            this.globalActivityStatus.setStatus(ActivityStatus.Success, ll.recoveryKit.saved());
            this.logger.debug('[RecoveryState] generateAndShareRecoveryKit success');
            this.globalActivityStatus.reset();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : ll.recoveryKit.errorGeneric();
            this.logger.error('[RecoveryState] generateAndShareRecoveryKit failed', { error, message });
            this.error.set(message);
            this.globalActivityStatus.setStatus(ActivityStatus.Error, message);
        }
    }

    public async finalize(recoveryCodeSaveConfirmed: boolean): Promise<void> {
        const ll = this.localization.getLL();
        this.error.set(undefined);
        if (!recoveryCodeSaveConfirmed) {
            this.error.set(ll.onboarding.errorConfirmSaveCode());
            return;
        }

        const therapist = this._getPendingTherapist();
        if (!therapist) {
            this.error.set(ll.onboarding.errorSessionLost());
            return;
        }

        try {
            await this.registry.getRepository(Therapist).persist(therapist);
            this.startupOrchestrator.run();
            this.logger.debug('[RecoveryState] finalize success');
        } catch (error: unknown) {
            this.logger.debug('[RecoveryState] finalize persist failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.error.set(error instanceof Error ? error.message : ll.onboarding.errorSaveAccount());
        }
    }

    public reset(): void {
        super.reset();
        this.recoveryCode.set('');
        this.globalActivityStatus.reset();
    }
}

// DI registration for recovery substate
Container.register(RecoveryState, () => {
    const logger = Container.get(AppLogger);
    const recoveryKit = new RecoveryKit(logger);
    const globalActivityStatus = Container.get(GlobalActivityStatus);
    const localization = Container.get(Localization);
    const registry = Container.get(Registry);
    const startupOrchestrator = Container.get(StartupOrchestrator);

    return new RecoveryState(logger, recoveryKit, globalActivityStatus, localization, registry, startupOrchestrator);
});
