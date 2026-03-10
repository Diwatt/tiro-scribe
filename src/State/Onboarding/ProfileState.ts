import { observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Localization } from '@/Localization';
import { AbstractState } from './AbstractState';
import { FormValidator, type ProfileStepData } from './FormValidator';
import type { ValidationResult } from './Types';

export class ProfileState extends AbstractState {
    public readonly practiceLanguages = observable<string[]>([]);
    private readonly locale: string;

    public constructor(logger: AppLogger, localization: Localization) {
        super(logger);
        this.locale = localization.getLocale();
        this.practiceLanguages.set([this.locale]);
    }

    public getProfileStepValidation(data: ProfileStepData): ValidationResult {
        const validator = new FormValidator();
        const result = validator.validateProfile(data);
        this.logger.debug('[ProfileState] getProfileStepValidation', {
            success: result.success,
            ...(result.success === false && { errorKeys: Object.keys(result.errors.fieldErrors) }),
        });

        return result;
    }

    public reset(): void {
        super.reset();
        this.practiceLanguages.set([this.locale]);
    }
}

// DI registration
Container.register(ProfileState, () => {
    const logger = Container.get(AppLogger);
    const localization = Container.get(Localization);
    return new ProfileState(logger, localization);
});
