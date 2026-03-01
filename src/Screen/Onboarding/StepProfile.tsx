import { observer } from '@legendapp/state/react';
import type React from 'react';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, useTheme } from 'react-native-paper';
import { useProfileAttributes } from '@/Api';
import { ChipGroup, MultiSelectModal, TextInput } from '@/Components/Form';
import { useAppLanguage } from '@/Localization';
import type { OnboardingFormData, ProfileStepData } from '@/State/Onboarding';
import { onboardingState } from '@/State/Onboarding';
import type { ExtendedTheme } from '@/theme/AppTheme';

const PROFILE_ATTRIBUTES_QUERY_OPTIONS = {
    staleTime: Infinity,
    gcTime: Infinity,
} as const;

export const StepProfile = observer(function stepProfile(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { locale, LL } = useAppLanguage();
    const { control, getValues, setError } = useFormContext<OnboardingFormData>();
    const error = onboardingState.state$.error.get();

    const profileAttributesQuery = useProfileAttributes({
        ...PROFILE_ATTRIBUTES_QUERY_OPTIONS,
        locale,
    });
    const data = profileAttributesQuery.data;
    const { qualifications = [], therapyMethods = [], languages = [] } = data ?? {};
    const isLoading = profileAttributesQuery.isLoading;

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
            <View style={[STYLES.stepRoot, STYLES.loadingContainer]}>
                <ActivityIndicator size="large" />
                <Text style={[STYLES.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                    {LL.onboarding.aboutYou()}
                </Text>
            </View>
        );
    }

    return (
        <View style={STYLES.stepRoot}>
            <View style={STYLES.stepBody}>
                <Text style={[STYLES.stepTitle, { color: theme.colors.onBackground }]}>{LL.onboarding.aboutYou()}</Text>
                <Text style={[STYLES.body, { color: theme.colors.onSurfaceVariant }]}>
                    {LL.onboarding.aboutYouDesc()}
                </Text>
                <ChipGroup control={control} name="languages" label={LL.onboarding.languages()} options={languages} />
                <MultiSelectModal
                    control={control}
                    name="qualifications"
                    label={LL.onboarding.qualifications()}
                    options={qualifications}
                    placeholder={LL.onboarding.qualificationsPlaceholder()}
                />
                <TextInput
                    control={control}
                    name="experience"
                    label={LL.onboarding.experience()}
                    keyboardType="number-pad"
                    numericOnly
                    style={STYLES.input}
                />
                <MultiSelectModal
                    control={control}
                    name="methods"
                    label={LL.onboarding.methods()}
                    options={therapyMethods}
                    placeholder={LL.onboarding.methodsPlaceholder()}
                />
                {error ? (
                    <HelperText type="error" visible>
                        {error}
                    </HelperText>
                ) : null}
            </View>
            <View style={STYLES.stepSpacer} />
            <Button
                mode="contained"
                onPress={handleContinue}
                style={STYLES.primaryButton}
                contentStyle={STYLES.primaryButtonContent}
            >
                {LL.onboarding.continue()}
            </Button>
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
    primaryButton: { marginTop: 0 },
    primaryButtonContent: { minHeight: 48 },
    loadingContainer: { justifyContent: 'center', alignItems: 'center', gap: 16 },
    loadingText: { fontSize: 16 },
});
