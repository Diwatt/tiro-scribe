import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from '@legendapp/state/react';
import type React from 'react';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization/Localization';
import { type OnboardingFormData, Schema } from '@/State/Onboarding';
import { OnboardingState } from '@/State/Onboarding/State';
import { OnboardingStep } from '@/State/Onboarding/Types';
import { PaperInk } from '@/theme/PaperInk';
import { StepRecovery } from './StepRecovery';
import { StepVault } from './StepVault';
import { StepVoice } from './StepVoice';

export interface OnboardingScreenProps {
    onComplete?: () => void;
}

/**
 * Onboarding wizard: vault (languages + master password), voice calibration, recovery kit.
 * The former practice-profile step is gone; any leftover Profile step falls back to the vault.
 */
export const OnboardingScreen = observer((_props: OnboardingScreenProps): React.JSX.Element => {
    const { locale } = useLocalization();
    const onboarding = Container.get(OnboardingState);
    const step = onboarding.step.get() ?? OnboardingStep.Account;
    const visibleSteps = [OnboardingStep.Account, OnboardingStep.Voice, OnboardingStep.Recovery];
    const total = visibleSteps.length;

    const methods = useForm<OnboardingFormData>({
        defaultValues: { ...Schema.defaults, languages: [locale] },
        resolver: zodResolver(Schema.form),
        mode: 'onSubmit',
    });

    useEffect(() => {
        onboarding.reset();
    }, [onboarding]);

    return (
        <FormProvider {...methods}>
            <KeyboardAvoidingView style={STYLES.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {step === OnboardingStep.Voice ? (
                    <StepVoice step={2} total={total} />
                ) : step === OnboardingStep.Recovery ? (
                    <StepRecovery step={3} total={total} />
                ) : (
                    <StepVault step={1} total={total} />
                )}
            </KeyboardAvoidingView>
        </FormProvider>
    );
});

const STYLES = StyleSheet.create({
    root: { flex: 1, backgroundColor: PaperInk.PAPER },
});
