import type React from 'react';
import { useCallback } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, HelperText } from 'react-native-paper';
import { LANGUAGES, QUALIFICATIONS, THERAPY_METHODS, onboardingState } from '@/State/Onboarding';
import type { OnboardingFormData, ProfileStepData } from '@/State/Onboarding';
import { ChipGroup, MultiSelectModal, TextInput } from '../../Components/Form';
import type { StepProps } from './Screen';

const styles = StyleSheet.create({
    stepTitle: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
    body: { fontSize: 16, marginBottom: 24, lineHeight: 24 },
    input: { marginBottom: 12 },
    primaryButton: { marginTop: 16 },
    primaryButtonContent: { minHeight: 48 },
});

export function StepProfile(props: StepProps): React.JSX.Element {
    const { control, theme, actions, error, setError, getValues } = props;
    const handleContinue = useCallback(() => {
        const result = onboardingState.getProfileStepValidation(getValues() as ProfileStepData);
        if (!result.success) {
            Object.entries(result.errors).forEach(([field, message]) => {
                setError(field as keyof OnboardingFormData & string, { message });
            });
            return;
        }
        onboardingState.goToStep(2);
    }, [getValues, setError]);
    return (
        <>
            <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>About you</Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>So we can tailor the app to your practice.</Text>
            <ChipGroup control={control} name="languages" label="Languages" options={LANGUAGES} />
            <MultiSelectModal control={control} name="qualifications" label="Qualifications" options={QUALIFICATIONS} placeholder="Search qualifications…" />
            <TextInput control={control} name="experience" label="Experience (years)" keyboardType="number-pad" numericOnly style={styles.input} />
            <MultiSelectModal control={control} name="methods" label="Therapy methods" options={THERAPY_METHODS} placeholder="Search methods…" />
            {error ? (
                <HelperText type="error" visible>
                    {error}
                </HelperText>
            ) : null}
            <Button
                mode="contained"
                onPress={handleContinue}
                style={[styles.primaryButton, { backgroundColor: actions.primary.background }]}
                contentStyle={styles.primaryButtonContent}
            >
                Continue
            </Button>
        </>
    );
}
