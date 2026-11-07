import type { Therapist } from '@/Entity/Therapist';

jest.mock('@legendapp/state', () => jest.requireActual('../../stubs/LegendAppStateStub'));

import { RestoreState } from '@/State/Start/RestoreState';
import { AppRouter } from '@/Core/AppRouter';
import { AppLogger } from '@/Core/AppLogger';
import { Localization } from '@/Localization';
import { TherapistRepository } from '@/Repository';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { TherapistForge } from '@/Security/TherapistForge';
import { StartupOrchestrator } from '@/State/StartupOrchestrator';

jest.mock('@/Core/Container', () => ({
    Container: { get: jest.fn(), register: jest.fn() },
}));

describe('RestoreState', () => {
    let restoreState: RestoreState;
    const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as AppLogger;
    const mockLocalization = {
        getLL: jest.fn(() => ({
            restoreVault: {
                errorNoVault: () => 'no vault',
                errorInvalidCode: () => 'invalid code',
                errorGeneric: () => 'generic failure',
            },
        })),
    } as unknown as Localization;
    const mockRepository = {
        findCurrent: jest.fn(),
        persist: jest.fn(),
    } as unknown as TherapistRepository;
    const mockForge = { recover: jest.fn() } as unknown as TherapistForge;
    const mockVault = { save: jest.fn() } as unknown as MasterKeyVault;
    const mockOrchestrator = { run: jest.fn() } as unknown as StartupOrchestrator;
    const mockRouter = { replace: jest.fn() } as unknown as AppRouter;

    const therapist = { getUuid: () => 'thera-1' } as unknown as Therapist;

    beforeEach(() => {
        jest.clearAllMocks();
        restoreState = new RestoreState(
            mockLogger,
            mockRepository,
            mockForge,
            mockVault,
            mockOrchestrator,
            mockRouter,
            mockLocalization,
        );
    });

    describe('restore', () => {
        it('recovers the master key, persists the therapist and opens the main screen', async () => {
            mockRepository.findCurrent = jest.fn().mockResolvedValue(therapist);
            mockForge.recover = jest.fn().mockReturnValue('master-key');
            mockRepository.persist = jest.fn().mockResolvedValue(undefined);
            mockVault.save = jest.fn().mockResolvedValue(undefined);
            mockOrchestrator.run = jest.fn().mockResolvedValue(undefined);
            restoreState.recoveryCode.set('abcd efgh jklm');
            restoreState.newPassword.set('new-password');

            await restoreState.restore();

            expect(mockForge.recover).toHaveBeenCalledWith(therapist, 'ABCD-EFGH-JKLM', 'new-password');
            expect(mockRepository.persist).toHaveBeenCalledWith(therapist);
            expect(mockVault.save).toHaveBeenCalledWith('thera-1', 'master-key');
            expect(mockOrchestrator.run).toHaveBeenCalledTimes(1);
            expect(mockRouter.replace).toHaveBeenCalledWith('/main');
            expect(restoreState.error.get()).toBeUndefined();
        });

        it('reports no vault when the device has no Therapist row', async () => {
            mockRepository.findCurrent = jest.fn().mockResolvedValue(undefined);

            await restoreState.restore();

            expect(restoreState.error.get()).toBe('no vault');
            expect(mockForge.recover).not.toHaveBeenCalled();
            expect(mockRouter.replace).not.toHaveBeenCalled();
        });

        it('rejects a wrong recovery code without touching persistence', async () => {
            mockRepository.findCurrent = jest.fn().mockResolvedValue(therapist);
            mockForge.recover = jest.fn(() => {
                throw new Error('decryption failed');
            });

            await restoreState.restore();

            expect(restoreState.error.get()).toBe('invalid code');
            expect(mockRepository.persist).not.toHaveBeenCalled();
            expect(mockVault.save).not.toHaveBeenCalled();
            expect(mockRouter.replace).not.toHaveBeenCalled();
        });

        it('reports a generic failure when persistence fails after a valid code', async () => {
            mockRepository.findCurrent = jest.fn().mockResolvedValue(therapist);
            mockForge.recover = jest.fn().mockReturnValue('master-key');
            mockRepository.persist = jest.fn().mockRejectedValue(new Error('disk full'));

            await restoreState.restore();

            expect(restoreState.error.get()).toBe('generic failure');
            expect(mockVault.save).not.toHaveBeenCalled();
            expect(mockRouter.replace).not.toHaveBeenCalled();
        });

        it('reports a generic failure when the vault write fails after persist', async () => {
            mockRepository.findCurrent = jest.fn().mockResolvedValue(therapist);
            mockForge.recover = jest.fn().mockReturnValue('master-key');
            mockRepository.persist = jest.fn().mockResolvedValue(undefined);
            mockVault.save = jest.fn().mockRejectedValue(new Error('secure store unavailable'));

            await restoreState.restore();

            expect(restoreState.error.get()).toBe('generic failure');
            expect(mockRouter.replace).not.toHaveBeenCalled();
        });

        it('toggles isBusy while restoring', async () => {
            let resolveFind!: (value: Therapist) => void;
            const findPromise = new Promise<Therapist>((resolve) => {
                resolveFind = resolve;
            });
            mockRepository.findCurrent = jest.fn().mockReturnValue(findPromise);
            const pending = restoreState.restore();
            expect(restoreState.isBusy.get()).toBe(true);

            resolveFind(therapist);
            mockForge.recover = jest.fn().mockReturnValue('master-key');
            mockRepository.persist = jest.fn().mockResolvedValue(undefined);
            mockVault.save = jest.fn().mockResolvedValue(undefined);
            mockOrchestrator.run = jest.fn().mockResolvedValue(undefined);
            await pending;
            expect(restoreState.isBusy.get()).toBe(false);
        });
    });

    describe('reset', () => {
        it('clears the form observables and the error', () => {
            restoreState.recoveryCode.set('ABCD-EFGH-JKLM-NOPQ');
            restoreState.newPassword.set('new-password');
            restoreState.error.set('invalid code');

            restoreState.reset();

            expect(restoreState.recoveryCode.get()).toBe('');
            expect(restoreState.newPassword.get()).toBe('');
            expect(restoreState.error.get()).toBeUndefined();
        });
    });
});
