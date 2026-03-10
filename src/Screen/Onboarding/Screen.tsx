import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from '@legendapp/state/react';
import React, { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { ProgressBar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization/Localization';
import { ONBOARDING_STEPS, type OnboardingFormData, Schema } from '@/State/Onboarding';
import { OnboardingState } from '@/State/Onboarding/State';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { StepAccount } from './StepAccount';
import { StepProfile } from './StepProfile';
import { StepRecovery } from './StepRecovery';
import { StepVoice } from './StepVoice';

export interface OnboardingScreenProps {
    onComplete?: () => void;
}

/** Step views in order (index 0 = step 1). */
const STEP_VIEWS = [StepProfile, StepAccount, StepVoice, StepRecovery] as const;

export const OnboardingScreen = observer((_props: OnboardingScreenProps): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const { locale, LL } = useLocalization();
    const onboarding = Container.get(OnboardingState);
    const rawStep = onboarding.step.get() ?? 1;
    const step = Math.max(1, Math.min(rawStep, ONBOARDING_STEPS));
    const progress = step / ONBOARDING_STEPS;

    const methods = useForm<OnboardingFormData>({
        defaultValues: { ...Schema.defaults, languages: [locale] },
        resolver: zodResolver(Schema.form),
        mode: 'onBlur',
    });

    useEffect(() => {
        onboarding.reset();
    }, [onboarding]);

    const stepComponent = STEP_VIEWS[step - 1] ?? null;

    return (
        <FormProvider {...methods}>
            <SafeAreaView
                style={[STYLES.container, { backgroundColor: theme.colors.background }]}
                edges={['top', 'left', 'right', 'bottom']}
            >
                <KeyboardAvoidingView style={STYLES.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={STYLES.inner}>
                            <ProgressBar progress={progress} color={theme.colors.tertiary} style={STYLES.progress} />
                            <View style={STYLES.headerRow}>
                                <Text style={[STYLES.stepLabel, { color: theme.colors.onSurfaceVariant }]}>
                                    {LL.onboarding.step({ current: step, total: ONBOARDING_STEPS })}
                                </Text>
                            </View>
                            <ScrollView
                                contentContainerStyle={STYLES.scrollContent}
                                keyboardShouldPersistTaps="always"
                                keyboardDismissMode="on-drag"
                                showsVerticalScrollIndicator={false}
                            >
                                {stepComponent ? React.createElement(stepComponent) : null}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </FormProvider>
    );
});

const STYLES = StyleSheet.create({
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
