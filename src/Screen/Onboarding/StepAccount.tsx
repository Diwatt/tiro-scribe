import { observer } from '@legendapp/state/react';
import type { Result } from 'check-password-strength';
import { passwordStrength as checkPasswordStrength } from 'check-password-strength';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, ProgressBar, useTheme } from 'react-native-paper';
import { TextInput } from '@/Components/Form';
import { useAppLanguage } from '@/Localization';
import type { OnboardingFormData } from '@/State/Onboarding';
import { onboardingState } from '@/State/Onboarding';
import type { ExtendedTheme } from '@/theme/AppTheme';

/** High-contrast colors for password strength so Too weak / Weak / Strong are clearly distinguishable. */
const STRENGTH_COLORS = {
    tooWeak: '#DC2626',
    weak: '#D97706',
    mediumOrStrong: '#059669',
} as const;

export const StepAccount = observer(function StepAccount(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    const { control, handleSubmit, watch, clearErrors } = useFormContext<OnboardingFormData>();
    const error = onboardingState.state$.error.get();
    const isBusy = onboardingState.state$.isBusy.get();

    const password = watch('password');
    const confirmPassword = watch('confirmPassword');
    const passwordStrength: Result<string> | null = useMemo(() => (password ? checkPasswordStrength(password) : null), [password]);

    useEffect(() => {
        if (password && confirmPassword && password === confirmPassword) {
            clearErrors('confirmPassword');
        }
    }, [password, confirmPassword, clearErrors]);

    return (
        <View style={styles.stepRoot}>
            <View style={styles.stepBody}>
                <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>{LL.onboarding.secureAccount()}</Text>
                <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{LL.onboarding.secureAccountDesc()}</Text>
                <TextInput
                    control={control}
                    name="email"
                    label={LL.onboarding.email()}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                />
                <TextInput control={control} name="password" label={LL.onboarding.password()} secureTextEntry style={styles.input} />
                <View style={styles.strengthRow}>
                    <ProgressBar
                        progress={passwordStrength ? (passwordStrength.id + 1) / 4 : 0}
                        color={
                            passwordStrength
                                ? passwordStrength.id === 0
                                    ? STRENGTH_COLORS.tooWeak
                                    : passwordStrength.id === 1
                                      ? STRENGTH_COLORS.weak
                                      : STRENGTH_COLORS.mediumOrStrong
                                : theme.colors.outline
                        }
                        style={styles.strengthBar}
                    />
                    {passwordStrength ? (
                        <Text
                            style={[
                                styles.strengthLabel,
                                {
                                    color:
                                        passwordStrength.id === 0
                                            ? STRENGTH_COLORS.tooWeak
                                            : passwordStrength.id === 1
                                              ? STRENGTH_COLORS.weak
                                              : STRENGTH_COLORS.mediumOrStrong,
                                },
                            ]}
                        >
                            {passwordStrength.value}
                        </Text>
                    ) : null}
                </View>
                <TextInput control={control} name="confirmPassword" label={LL.onboarding.confirmPassword()} secureTextEntry style={styles.input} />
                {error ? (
                    <HelperText type="error" visible>
                        {error}
                    </HelperText>
                ) : null}
            </View>
            <View style={styles.stepSpacer} />
            <View style={styles.buttonRow}>
                <Button
                    mode="contained"
                    onPress={() => onboardingState.goToStep(1)}
                    buttonColor={theme.colors.secondary}
                    textColor={theme.colors.onSecondary}
                    style={styles.buttonHalf}
                    contentStyle={styles.primaryButtonContent}
                >
                    {LL.onboarding.back()}
                </Button>
                <Button
                    mode="contained"
                    loading={isBusy}
                    disabled={isBusy}
                    onPress={handleSubmit((data) => onboardingState.submit(data))}
                    style={styles.buttonHalf}
                    contentStyle={styles.primaryButtonContent}
                >
                    {isBusy ? LL.onboarding.creatingAccount() : LL.onboarding.continue()}
                </Button>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    stepRoot: { flex: 1 },
    stepBody: { flexGrow: 0 },
    stepSpacer: { flex: 1, minHeight: 24 },
    stepTitle: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
    body: { fontSize: 16, marginBottom: 24, lineHeight: 24 },
    input: { marginBottom: 12 },
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    strengthBar: { flex: 1, height: 4 },
    strengthLabel: { fontSize: 12, minWidth: 56 },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 0 },
    buttonHalf: { flex: 1 },
    primaryButtonContent: { minHeight: 48 },
});
