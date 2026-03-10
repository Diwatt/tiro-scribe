import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import type { Therapist } from '@/Entity/Therapist';
import { CryptoEngine, RecoveryCode } from '@/Security';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import type { CreateTherapistInput } from '@/Security/TherapistForge';
import { TherapistForge } from '@/Security/TherapistForge';
import { AbstractState } from './AbstractState';
import type { OnboardingFormData } from './Schema';

export interface AccountCreationResult {
    therapist: Therapist;
    recoveryCode: string;
}

export class AccountState extends AbstractState {
    private onSuccess?: (result: AccountCreationResult) => void;

    public constructor(
        logger: AppLogger,
        private readonly masterKeyVault: MasterKeyVault,
    ) {
        super(logger);
    }

    public setOnSuccess(handler: (result: AccountCreationResult) => void): void {
        this.onSuccess = handler;
    }

    public async submit(data: OnboardingFormData, practiceLanguages: string[]): Promise<void> {
        await this.runAsyncAction(async () => {
            const input = this.buildAccountInput(data, practiceLanguages);
            const crypto = new CryptoEngine();
            const recovery = new RecoveryCode();
            const forge = new TherapistForge(crypto, recovery);
            const { therapist, artifacts } = forge.create(input);

            await this.masterKeyVault.save(therapist.uuid, artifacts.masterKey);

            if (this.onSuccess) {
                this.onSuccess({ therapist, recoveryCode: artifacts.recoveryCode });
            }
        });
    }

    private buildAccountInput(data: OnboardingFormData, practiceLanguagesFallback: string[]): CreateTherapistInput {
        // prefer the languages the user entered, otherwise fall back to the
        // supplied array (typically the locale).
        let languages: string[] = practiceLanguagesFallback;
        if (Array.isArray(data.languages) && data.languages.length > 0) {
            languages = data.languages;
        }

        return {
            email: data.email,
            password: data.password,
            languages,
            qualifications: Array.isArray(data.qualifications) ? data.qualifications : [],
            experience: String(data.experience ?? '').trim(),
            methods: Array.isArray(data.methods) ? data.methods : [],
        };
    }
}

// the state classes are registered in their own module to keep the DI
// configuration next to the implementation.  callers just `Container.get`.
Container.register(AccountState, () => {
    const logger = Container.get(AppLogger);
    const vault = Container.get(MasterKeyVault);
    return new AccountState(logger, vault);
});
