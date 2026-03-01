import { observer } from '@legendapp/state/react';
import { Copy, FileText } from 'lucide-react-native';
import type React from 'react';
import { useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, Snackbar, useTheme } from 'react-native-paper';
import { AsyncButton } from '@/Components';
import { Checkbox } from '@/Components/Form';
import { useAppLanguage } from '@/Localization';
import type { OnboardingFormData } from '@/State/Onboarding';
import { onboardingState } from '@/State/Onboarding';
import type { ExtendedTheme } from '@/theme/AppTheme';

const RECOVERY_CODE_COPIED_DURATION_MS = 2000;

export const StepRecovery = observer(function stepRecovery(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    const { control, getValues } = useFormContext<OnboardingFormData>();
    const actions = theme.colors.actions;
    const error = onboardingState.state$.error.get();
    const recoveryCode = onboardingState.state$.recoveryCode.get();

    const [recoveryCodeCopied, setRecoveryCodeCopied] = useState(false);
    const handleCopyRecoveryCode = useCallback(async () => {
        await onboardingState.copyRecoveryCodeToClipboard();
        setRecoveryCodeCopied(true);
        setTimeout(() => setRecoveryCodeCopied(false), RECOVERY_CODE_COPIED_DURATION_MS);
    }, []);
    const handleSaveRecoveryKit = useCallback(() => onboardingState.generateAndShareRecoveryKit(), []);

    return (
        <View style={STYLES.stepRoot}>
            <View style={STYLES.stepBody}>
                <Text style={[STYLES.stepTitle, { color: theme.colors.onBackground }]}>
                    {LL.onboarding.accountReady()}
                </Text>
                <Text style={[STYLES.body, { color: theme.colors.onSurfaceVariant }]}>
                    {LL.onboarding.recoveryDesc()}
                </Text>
                <View style={[STYLES.codeBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text selectable style={[STYLES.codeText, { color: theme.colors.onSurface }]}>
                        {recoveryCode}
                    </Text>
                </View>

                <AsyncButton
                    idleLabel={LL.onboarding.saveRecoveryKit()}
                    pendingLabel={LL.onboarding.recoveryKitPending()}
                    onPress={handleSaveRecoveryKit}
                    icon={({ size, color }) => <FileText size={size} color={color} />}
                    style={[STYLES.primaryButton, { backgroundColor: theme.colors.primary }]}
                    contentStyle={STYLES.primaryButtonContent}
                    labelStyle={{ color: theme.colors.onPrimary }}
                />

                <Button
                    mode="outlined"
                    onPress={handleCopyRecoveryCode}
                    icon={({ size, color }) => <Copy size={size} color={color} />}
                    style={STYLES.copyButton}
                    contentStyle={STYLES.primaryButtonContent}
                >
                    {LL.onboarding.copyCode()}
                </Button>

                <Snackbar
                    visible={recoveryCodeCopied}
                    onDismiss={() => {
                        /* Snackbar auto-dismisses */
                    }}
                    duration={2000}
                    style={{ marginBottom: 16 }}
                >
                    {LL.onboarding.codeCopied()}
                </Snackbar>

                <Checkbox
                    control={control}
                    name="recoveryCodeSaveConfirmed"
                    label={LL.onboarding.savedCodeChecked()}
                    labelStyle={STYLES.checkboxLabel}
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
                onPress={() => void onboardingState.finalize(!!getValues('recoveryCodeSaveConfirmed'))}
                style={[STYLES.primaryButton, { backgroundColor: actions.success.background }]}
                contentStyle={STYLES.primaryButtonContent}
            >
                {LL.onboarding.finish()}
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
    codeBox: { padding: 16, borderRadius: 8, marginBottom: 16 },
    codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 16 },
    primaryButton: { marginTop: 0 },
    primaryButtonContent: { minHeight: 48 },
    copyButton: { marginBottom: 8 },
    checkboxLabel: { marginLeft: 8, fontSize: 16 },
});
