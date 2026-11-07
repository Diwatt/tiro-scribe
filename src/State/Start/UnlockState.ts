/**
 * UnlockState – Auth-gated boot ViewModel: decrypts the database key from the
 * keyfile with the master password, then opens the database and routes. A
 * wrong password leaves the error set and the app locked (cf.
 * docs/AUTH_GATED_BOOT.md).
 */

import { observable } from '@legendapp/state';
import { AppRouter } from '@/Core/AppRouter';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Database } from '@/Database/Database';
import { ENTITY_CLASSES } from '@/Entity';
import { Localization } from '@/Localization';
import { DatabaseKeyfile, type DatabaseKeyfileData } from '@/Security';
import { AbstractState } from '@/State/Onboarding/AbstractState';
import { StartupOrchestrator, StartupState } from '@/State/StartupOrchestrator';

export class UnlockState extends AbstractState {
    public readonly password = observable<string>('');

    public constructor(
        logger: AppLogger,
        private readonly keyfile: DatabaseKeyfile,
        private readonly startupOrchestrator: StartupOrchestrator,
        private readonly router: AppRouter,
        private readonly localization: Localization,
    ) {
        super(logger);
    }

    public async unlock(): Promise<void> {
        await this.runAsyncAction(async () => {
            this.error.set(undefined);
            const ll = this.localization.getLL();

            let content: DatabaseKeyfileData;
            try {
                content = await this.keyfile.read();
            } catch (error: unknown) {
                this.logger.error('[UnlockState] keyfile unreadable', {
                    error: error instanceof Error ? error.message : String(error),
                });
                this.error.set(ll.unlockVault.errorKeyfile());

                return;
            }

            const dbKey = this.keyfile.decryptWithPassword(content, this.password.get());
            if (dbKey == null) {
                this.error.set(ll.unlockVault.errorWrongPassword());

                return;
            }

            await Database.initialize({ entities: ENTITY_CLASSES, dbKey });
            await this.startupOrchestrator.run();

            const state = this.startupOrchestrator.stateObservable.get();
            this.router.replace(state === StartupState.Onboarding ? '/onboarding' : '/main');
        });
    }

    public reset(): void {
        super.reset();
        this.password.set('');
    }
}

Container.register(UnlockState, () => {
    const logger = Container.get(AppLogger);
    const keyfile = Container.get(DatabaseKeyfile);
    const startupOrchestrator = Container.get(StartupOrchestrator);
    const router = Container.get(AppRouter);
    const localization = Container.get(Localization);

    return new UnlockState(logger, keyfile, startupOrchestrator, router, localization);
});
