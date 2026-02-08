import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, ProgressBar } from 'react-native-paper';
import { onboardingState } from '@/State/Onboarding';
import { TextInput } from '../../Components/Form';
import type { StepProps } from './Screen';

const styles = StyleSheet.create({
    stepTitle: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
    body: { fontSize: 16, marginBottom: 24, lineHeight: 24 },
    input: { marginBottom: 12 },
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    strengthBar: { flex: 1, height: 4 },
    strengthLabel: { fontSize: 12, minWidth: 56 },
    primaryButton: { marginTop: 16 },
    primaryButtonContent: { minHeight: 48 },
    backButton: { marginTop: 8 },
});

export function StepAccount(props: StepProps): React.JSX.Element {
    const { control, theme, actions, error, isBusy, passwordStrength, handleSubmit } = props;
    return (
        <>
            <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>Secure account</Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
                Your data is encrypted with this password. We never see it.
            </Text>
            <TextInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput control={control} name="password" label="Password" secureTextEntry style={styles.input} />
            <View style={styles.strengthRow}>
                <ProgressBar
                    progress={passwordStrength ? (passwordStrength.id + 1) / 4 : 0}
                    color={theme.colors.primary}
                    style={styles.strengthBar}
                />
                {passwordStrength ? (
                    <Text style={[styles.strengthLabel, { color: theme.colors.onSurfaceVariant }]}>{passwordStrength.value}</Text>
                ) : null}
            </View>
            <TextInput control={control} name="confirmPassword" label="Confirm password" secureTextEntry style={styles.input} />
            {error ? (
                <HelperText type="error" visible>
                    {error}
                </HelperText>
            ) : null}
            <Button
                mode="contained"
                loading={isBusy}
                disabled={isBusy}
                onPress={handleSubmit((data) => onboardingState.submit(data))}
                style={[styles.primaryButton, { backgroundColor: actions.primary.background }]}
                contentStyle={styles.primaryButtonContent}
            >
                {isBusy ? 'Creating account…' : 'Continue'}
            </Button>
            <Button
                mode="text"
                onPress={() => onboardingState.goToStep(1)}
                style={styles.backButton}
                contentStyle={styles.primaryButtonContent}
            >
                Back
            </Button>
        </>
    );
}
