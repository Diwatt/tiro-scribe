import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from '@legendapp/state/react';
import type React from 'react';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { ProgressBar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppLanguage } from '@/Localization';
import { ONBOARDING_STEPS, type OnboardingFormData, onboardingState, Schema } from '@/State/Onboarding';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { StepAccount } from './StepAccount';
import { StepProfile } from './StepProfile';
import { StepRecovery } from './StepRecovery';
import { StepVoice } from './StepVoice';

export interface OnboardingScreenProps {
    onComplete?: () => void;
}

/** Step views in order (index 0 = step 1). */
const stepViews = [StepProfile, StepAccount, StepVoice, StepRecovery] as const;

export const OnboardingScreen = observer((_props: OnboardingScreenProps): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const { locale, LL } = useAppLanguage();
    const rawStep = onboardingState?.state$?.step?.get() ?? 1;
    const step = Math.max(1, Math.min(rawStep, ONBOARDING_STEPS));
    const progress = step / ONBOARDING_STEPS;

    const methods = useForm<OnboardingFormData>({
        defaultValues: { ...Schema.defaults, languages: [locale] },
        resolver: zodResolver(Schema.form),
        mode: 'onBlur',
    });

    useEffect(() => {
        onboardingState.reset();
    }, []);

    const StepView = stepViews[step - 1] ?? null;

    return (
        <FormProvider {...methods}>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
                <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.inner}>
                            <ProgressBar progress={progress} color={theme.colors.tertiary} style={styles.progress} />
                            <View style={styles.headerRow}>
                                <Text style={[styles.stepLabel, { color: theme.colors.onSurfaceVariant }]}>
                                    {LL.onboarding.step({ current: step, total: ONBOARDING_STEPS })}
                                </Text>
                            </View>
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                keyboardShouldPersistTaps="always"
                                keyboardDismissMode="on-drag"
                                showsVerticalScrollIndicator={false}
                            >
                                {StepView && <StepView />}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </FormProvider>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
        paddingHorizontal: 24,
    },
    progress: { height: 4, marginHorizontal: -24 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 8,
    },
    stepLabel: { fontSize: 12 },
    scrollContent: {
        paddingTop: 8,
        paddingBottom: 48,
        flexGrow: 1,
    },
});
