import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from '@legendapp/state/react';
import type { Result } from 'check-password-strength';
import { passwordStrength as checkPasswordStrength } from 'check-password-strength';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Control, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { ProgressBar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { defaultOnboardingFormData, ONBOARDING_STEPS, type OnboardingFormData, onboardingSchema, onboardingState } from '@/State/Onboarding';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { StepAccount } from './StepAccount';
import { StepProfile } from './StepProfile';
import { StepRecovery } from './StepRecovery';
import { StepVoice } from './StepVoice';

export interface OnboardingScreenProps {
    onComplete?: () => void;
}

/** Props passed to every step view; each step destructures only what it needs. */
export interface StepProps {
    control: Control<OnboardingFormData>;
    theme: ExtendedTheme;
    actions: ExtendedTheme['colors']['actions'];
    error: string | undefined;
    isBusy: boolean;
    getValues: (name?: keyof OnboardingFormData) => unknown;
    setError: (name: keyof OnboardingFormData & string, opts: { message: string }) => void;
    handleSubmit: (onValid: (data: OnboardingFormData) => void) => () => void;
    passwordStrength: Result<string> | null;
    recoveryCode: string;
    recoveryCodeCopied: boolean;
    onCopyRecoveryCode: () => void;
    onSaveRecoveryKit: () => Promise<void>;
}

const RECOVERY_CODE_COPIED_DURATION_MS = 2000;

/** Step views in order (index 0 = step 1). */
const stepViews: Array<(props: StepProps) => React.JSX.Element> = [StepProfile, StepAccount, StepVoice, StepRecovery];

export const OnboardingScreen = observer((_props: OnboardingScreenProps): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const actions = theme.colors.actions;

    const step = onboardingState.state$.step.get();
    const recoveryCode = onboardingState.state$.recoveryCode.get();
    const error = onboardingState.state$.error.get();
    const isBusy = onboardingState.state$.isBusy.get();
    const progress = step / ONBOARDING_STEPS;

    const { control, handleSubmit, getValues, watch, setError } = useForm<OnboardingFormData>({
        defaultValues: defaultOnboardingFormData,
        resolver: zodResolver(onboardingSchema),
        mode: 'onBlur',
    });

    useEffect(() => {
        onboardingState.reset();
    }, []);

    const password = watch('password');
    const passwordStrength = useMemo(() => (password ? checkPasswordStrength(password) : null), [password]);

    const [recoveryCodeCopied, setRecoveryCodeCopied] = useState(false);
    const handleCopyRecoveryCode = useCallback(async () => {
        await onboardingState.copyRecoveryCodeToClipboard();
        setRecoveryCodeCopied(true);
        setTimeout(() => setRecoveryCodeCopied(false), RECOVERY_CODE_COPIED_DURATION_MS);
    }, []);
    const handleSaveRecoveryKit = useCallback(() => onboardingState.generateAndShareRecoveryKit(), []);

    const stepProps: StepProps = {
        control,
        theme,
        actions,
        error,
        isBusy,
        getValues,
        setError,
        handleSubmit,
        passwordStrength,
        recoveryCode,
        recoveryCodeCopied,
        onCopyRecoveryCode: handleCopyRecoveryCode,
        onSaveRecoveryKit: handleSaveRecoveryKit,
    };

    const StepView = stepViews[step - 1] ?? null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ProgressBar progress={progress} color={actions.primary.background} style={styles.progress} />
                <Text style={[styles.stepLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Step {step} of {ONBOARDING_STEPS}
                </Text>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
                    {StepView && <StepView {...stepProps} />}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    progress: { height: 4 },
    stepLabel: { fontSize: 12, marginHorizontal: 24, marginTop: 8, marginBottom: 4 },
    scrollContent: { padding: 24, paddingBottom: 48 },
});
