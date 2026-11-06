import { observer } from '@legendapp/state/react';
import { passwordStrength } from 'check-password-strength';
import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { LanguageOption, PracticeLanguage } from '@/Screen/Model';
import { VaultStepScreen } from '@/Screen/Start/VaultStepScreen';
import type { OnboardingFormData } from '@/State/Onboarding';
import { OnboardingState } from '@/State/Onboarding/State';

interface Props {
    step: number;
    total: number;
}

/** Onboarding step 1: session languages + master password, bound to the onboarding form. */
export const StepVault = observer(function StepVault({ step, total }: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const { watch, setValue, handleSubmit, formState } = useFormContext<OnboardingFormData>();
    const onboarding = Container.get(OnboardingState);
    const isBusy = onboarding.account.isBusy.get();
    const accountError = onboarding.account.error.get();
    const password = watch('password');
    const selected = watch('languages');
    const strength = useMemo(() => (password ? passwordStrength(password).id : -1), [password]);
    const strengthLabels = [LL.vault.strength0(), LL.vault.strength1(), LL.vault.strength2(), LL.vault.strength3()];
    const languages = PracticeLanguage.CODES.map((code) => LanguageOption.create(code, LL.languageName[code]()));

    const toggleLanguage = useCallback(
        (code: string) => {
            const next = selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code];
            setValue('languages', next, { shouldValidate: true });
        },
        [selected, setValue],
    );

    const errors = formState.errors;
    const fieldError = [errors.languages, errors.email, errors.password, errors.confirmPassword].find(
        (error) => error?.message,
    )?.message;
    const submit = handleSubmit((data) => onboarding.account.submit(data, data.languages));

    return (
        <VaultStepScreen
            step={step}
            total={total}
            languages={languages}
            selectedLanguages={selected}
            email={watch('email')}
            password={password}
            confirmation={watch('confirmPassword')}
            strength={strength < 0 ? 0 : (strength + 1) / strengthLabels.length}
            strengthLabel={strength < 0 ? '' : strengthLabels[strength]}
            error={accountError ?? fieldError}
            isBusy={isBusy}
            onToggleLanguage={toggleLanguage}
            onEmailChange={(value) => setValue('email', value)}
            onPasswordChange={(value) => setValue('password', value)}
            onConfirmationChange={(value) => setValue('confirmPassword', value, { shouldValidate: formState.isSubmitted })}
            onSubmit={() => void submit()}
        />
    );
});

