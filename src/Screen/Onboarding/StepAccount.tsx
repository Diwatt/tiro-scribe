import { observer } from '@legendapp/state/react';
import type { Result } from 'check-password-strength';
import { passwordStrength as checkPasswordStrength } from 'check-password-strength';
import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, ProgressBar, useTheme } from 'react-native-paper';
import { TextInput } from '@/Components/Form';
import { Container } from '@/Container';
import { useAppLanguage } from '@/Localization/AppLanguage';
import type { OnboardingFormData } from '@/State/Onboarding';
import type { ExtendedTheme } from '@/theme/AppTheme';

/** High-contrast colors for password strength so Too weak / Weak / Strong are clearly distinguishable. */
const STRENGTH_COLORS = {
    tooWeak: '#DC2626',
    weak: '#D97706',
    mediumOrStrong: '#059669',
} as const;

export const StepAccount = observer(function StepAccountComponent(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    const { control, handleSubmit, watch, clearErrors } = useFormContext<OnboardingFormData>();
    const error = Container.get(OnboardingState).state.error.get();
    const isBusy = Container.get(OnboardingState).state.isBusy.get();

    const password = watch('password');
    const confirmPassword = watch('confirmPassword');
    const passwordStrength: Result<string> | null = useMemo(
        () => (password ? checkPasswordStrength(password) : null),
        [password],
    );

    const handleBackPress = useCallback(() => {
        Container.get(OnboardingState).goToStep(1);
    }, []);

    const onSubmit = useCallback((formData: OnboardingFormData) => {
        Container.get(OnboardingState).submit(formData);
    }, []);

    useEffect(() => {
        if (password && confirmPassword && password === confirmPassword) {
            clearErrors('confirmPassword');
        }
    }, [password, confirmPassword, clearErrors]);

    return (
        <View style={STYLES.stepRoot}>
            <View style={STYLES.stepBody}>
                <Text style={[STYLES.stepTitle, { color: theme.colors.onBackground }]}>
                    {LL.onboarding.secureAccount()}
                </Text>
                <Text style={[STYLES.body, { color: theme.colors.onSurfaceVariant }]}>
                    {LL.onboarding.secureAccountDesc()}
                </Text>
                <TextInput
                    control={control}
                    name="email"
                    label={LL.onboarding.email()}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={STYLES.input}
                />
                <TextInput
                    control={control}
                    name="password"
                    label={LL.onboarding.password()}
                    secureTextEntry
                    style={STYLES.input}
                />
                <View style={STYLES.strengthRow}>
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
                        style={STYLES.strengthBar}
                    />
                    {passwordStrength ? (
                        <Text
                            style={[
                                STYLES.strengthLabel,
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
                <TextInput
                    control={control}
                    name="confirmPassword"
                    label={LL.onboarding.confirmPassword()}
                    secureTextEntry
                    style={STYLES.input}
                />
                {error ? (
                    <HelperText type="error" visible>
                        {error}
                    </HelperText>
                ) : null}
            </View>
            <View style={STYLES.stepSpacer} />
            <View style={STYLES.buttonRow}>
                <Button
                    mode="contained"
                    onPress={handleBackPress}
                    buttonColor={theme.colors.secondary}
                    textColor={theme.colors.onSecondary}
                    style={STYLES.buttonHalf}
                    contentStyle={STYLES.primaryButtonContent}
                >
                    {LL.onboarding.back()}
                </Button>
                <Button
                    mode="contained"
                    loading={isBusy}
                    disabled={isBusy}
                    onPress={handleSubmit(onSubmit)}
                    style={STYLES.buttonHalf}
                    contentStyle={STYLES.primaryButtonContent}
                >
                    {isBusy ? LL.onboarding.creatingAccount() : LL.onboarding.continue()}
                </Button>
            </View>
        </View>
    );
});

const STYLES = StyleSheet.create({
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
