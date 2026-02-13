import { observer } from '@legendapp/state/react';
import type React from 'react';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, useTheme } from 'react-native-paper';
import { useGetTaxonomy } from '@/api/generated/taxonomy/taxonomy';
import { ChipGroup, MultiSelectModal, TextInput } from '@/Components/Form';
import { useAppLanguage } from '@/Localization';
import type { OnboardingFormData, ProfileStepData } from '@/State/Onboarding';
import { onboardingState } from '@/State/Onboarding';
import type { ExtendedTheme } from '@/theme/AppTheme';

const TAXONOMY_QUERY_OPTIONS = {
    query: { staleTime: Infinity, gcTime: Infinity },
} as const;

export const StepProfile = observer(function StepProfile(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    const { control, getValues, setError } = useFormContext<OnboardingFormData>();
    const error = onboardingState.state$.error.get();

    const taxonomyQuery = useGetTaxonomy(TAXONOMY_QUERY_OPTIONS);
    const data = taxonomyQuery.data?.data;
    const { qualifications = [], therapyMethods = [], languages = [] } = data ?? {};
    const isLoading = taxonomyQuery.isLoading;

    const handleContinue = useCallback(() => {
        const data = getValues() as ProfileStepData;
        const result = onboardingState.getProfileStepValidation(data);
        if (!result.success) {
            const { formErrors, fieldErrors } = result.errors;
            for (const [field, messages] of Object.entries(fieldErrors)) {
                const msg = messages?.[0];
                if (msg) {
                    setError(field as keyof OnboardingFormData & string, { message: msg });
                }
            }
            if (formErrors[0]) {
                onboardingState.state$.error.set(formErrors[0]);
            }
            return;
        }
        onboardingState.state$.practiceLanguages.set([...data.languages]);
        onboardingState.goToStep(2);
    }, [getValues, setError]);

    if (isLoading) {
        return (
            <View style={[styles.stepRoot, styles.loadingContainer]}>
                <ActivityIndicator size="large" />
                <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>{LL.onboardingAboutYou()}</Text>
            </View>
        );
    }

    return (
        <View style={styles.stepRoot}>
            <View style={styles.stepBody}>
                <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>{LL.onboardingAboutYou()}</Text>
                <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{LL.onboardingAboutYouDesc()}</Text>
                <ChipGroup control={control} name="languages" label={LL.onboardingLanguages()} options={languages} />
                <MultiSelectModal
                    control={control}
                    name="qualifications"
                    label={LL.onboardingQualifications()}
                    options={qualifications}
                    placeholder={LL.onboardingQualificationsPlaceholder()}
                />
                <TextInput control={control} name="experience" label={LL.onboardingExperience()} keyboardType="number-pad" numericOnly style={styles.input} />
                <MultiSelectModal
                    control={control}
                    name="methods"
                    label={LL.onboardingMethods()}
                    options={therapyMethods}
                    placeholder={LL.onboardingMethodsPlaceholder()}
                />
                {error ? (
                    <HelperText type="error" visible>
                        {error}
                    </HelperText>
                ) : null}
            </View>
            <View style={styles.stepSpacer} />
            <Button mode="contained" onPress={handleContinue} style={styles.primaryButton} contentStyle={styles.primaryButtonContent}>
                {LL.onboardingContinue()}
            </Button>
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
    primaryButton: { marginTop: 0 },
    primaryButtonContent: { minHeight: 48 },
    loadingContainer: { justifyContent: 'center', alignItems: 'center', gap: 16 },
    loadingText: { fontSize: 16 },
});
