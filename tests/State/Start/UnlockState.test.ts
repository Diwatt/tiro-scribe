import { Database } from '@/Database/Database';
import { AppRouter } from '@/Core/AppRouter';
import { AppLogger } from '@/Core/AppLogger';
import { Localization } from '@/Localization';
import { DatabaseKeyfile } from '@/Security';
import { StartupOrchestrator, StartupState } from '@/State/StartupOrchestrator';
import { UnlockState } from '@/State/Start/UnlockState';

jest.mock('@legendapp/state', () => jest.requireActual('../../stubs/LegendAppStateStub'));

jest.mock('@/Core/Container', () => ({
    Container: { get: jest.fn(), register: jest.fn() },
}));

jest.mock('@/Database/Database', () => ({
    Database: { initialize: jest.fn(), getDatabaseKey: jest.fn() },
}));

describe('UnlockState', () => {
    let unlockState: UnlockState;
    const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as AppLogger;
    const mockLocalization = {
        getLL: jest.fn(() => ({
            unlockVault: {
                errorWrongPassword: () => 'wrong password',
                errorKeyfile: () => 'keyfile unreadable',
            },
        })),
    } as unknown as Localization;
    const mockKeyfile = {
        read: jest.fn(),
        decryptWithPassword: jest.fn(),
    } as unknown as DatabaseKeyfile;
    const mockOrchestrator = {
        run: jest.fn(),
        stateObservable: { get: jest.fn(() => StartupState.Ready) },
    } as unknown as StartupOrchestrator;
    const mockRouter = { replace: jest.fn() } as unknown as AppRouter;

    const content = { version: 1, slots: { password: {}, recovery: {} } };

    beforeEach(() => {
        jest.clearAllMocks();
        unlockState = new UnlockState(mockLogger, mockKeyfile, mockOrchestrator, mockRouter, mockLocalization);
    });

    describe('unlock', () => {
        it('decrypts the keyfile, initializes the database and routes to main', async () => {
            mockKeyfile.read = jest.fn().mockResolvedValue(content);
            mockKeyfile.decryptWithPassword = jest.fn().mockReturnValue('db-key');
            unlockState.password.set('master-password');

            await unlockState.unlock();

            expect(Database.initialize).toHaveBeenCalledWith(
                expect.objectContaining({ entities: expect.anything(), dbKey: 'db-key' }),
            );
            expect(mockOrchestrator.run).toHaveBeenCalledTimes(1);
            expect(mockRouter.replace).toHaveBeenCalledWith('/main');
            expect(unlockState.error.get()).toBeUndefined();
        });

        it('stays locked on a wrong password', async () => {
            mockKeyfile.read = jest.fn().mockResolvedValue(content);
            mockKeyfile.decryptWithPassword = jest.fn().mockReturnValue(null);
            unlockState.password.set('wrong-password');

            await unlockState.unlock();

            expect(unlockState.error.get()).toBe('wrong password');
            expect(Database.initialize).not.toHaveBeenCalled();
            expect(mockRouter.replace).not.toHaveBeenCalled();
        });

        it('reports a keyfile failure when the file cannot be read', async () => {
            mockKeyfile.read = jest.fn().mockRejectedValue(new Error('missing'));

            await unlockState.unlock();

            expect(unlockState.error.get()).toBe('keyfile unreadable');
            expect(mockKeyfile.decryptWithPassword).not.toHaveBeenCalled();
            expect(Database.initialize).not.toHaveBeenCalled();
        });

        it('routes to onboarding when no session exists after unlock', async () => {
            mockKeyfile.read = jest.fn().mockResolvedValue(content);
            mockKeyfile.decryptWithPassword = jest.fn().mockReturnValue('db-key');
            mockOrchestrator.run = jest.fn().mockImplementation(async () => {
                (mockOrchestrator.stateObservable.get as jest.Mock).mockReturnValue(StartupState.Onboarding);
            });

            await unlockState.unlock();

            expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding');
        });

        it('toggles isBusy while unlocking', async () => {
            let resolveRun!: () => void;
            const runPromise = new Promise<void>((resolve) => {
                resolveRun = resolve;
            });
            mockKeyfile.read = jest.fn().mockResolvedValue(content);
            mockKeyfile.decryptWithPassword = jest.fn().mockReturnValue('db-key');
            Database.initialize = jest.fn().mockResolvedValue({});
            mockOrchestrator.run = jest.fn().mockReturnValue(runPromise);

            const pending = unlockState.unlock();
            expect(unlockState.isBusy.get()).toBe(true);

            resolveRun();
            await pending;
            expect(unlockState.isBusy.get()).toBe(false);
        });
    });

    describe('reset', () => {
        it('clears the password and the error', () => {
            unlockState.password.set('master-password');
            unlockState.error.set('wrong password');

            unlockState.reset();

            expect(unlockState.password.get()).toBe('');
            expect(unlockState.error.get()).toBeUndefined();
        });
    });
});
