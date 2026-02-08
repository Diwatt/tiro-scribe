import { Copy, FileText } from 'lucide-react-native';
import type React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, Snackbar } from 'react-native-paper';
import { appAsyncStatus } from '@/State/AppAsyncStatus';
import { onboardingState } from '@/State/Onboarding';
import { AsyncButton } from '../../Components';
import { Checkbox } from '../../Components/Form';
import type { StepProps } from './Screen';

const SNACKBAR_COPY_MESSAGE = 'Code copié';

const styles = StyleSheet.create({
    stepTitle: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
    body: { fontSize: 16, marginBottom: 24, lineHeight: 24 },
    codeBox: { padding: 16, borderRadius: 8, marginBottom: 16 },
    codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 16 },
    primaryButton: { marginTop: 16 },
    primaryButtonContent: { minHeight: 48 },
    copyButton: { marginBottom: 8 },
    checkboxLabel: { marginLeft: 8, fontSize: 16 },
});

const RECOVERY_KIT_IDLE_LABEL = 'Sauvegarder mon Kit de Secours';
const RECOVERY_KIT_PENDING_LABEL = 'Génération en cours…';

export function StepRecovery(props: StepProps): React.JSX.Element {
    const { control, theme, actions, error, getValues, recoveryCode, recoveryCodeCopied, onCopyRecoveryCode, onSaveRecoveryKit } = props;

    return (
        <>
            <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>Account ready</Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
                Save this recovery code in a safe place. It is the only way to recover your account if you lose your password.
            </Text>
            <View style={[styles.codeBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text selectable style={[styles.codeText, { color: theme.colors.onSurface }]}>
                    {recoveryCode}
                </Text>
            </View>

            <AsyncButton
                statusKey={appAsyncStatus.recoveryKitStatusKey}
                idleLabel={RECOVERY_KIT_IDLE_LABEL}
                pendingLabel={RECOVERY_KIT_PENDING_LABEL}
                onPress={onSaveRecoveryKit}
                icon={({ size, color }) => <FileText size={size} color={color} />}
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                contentStyle={styles.primaryButtonContent}
                labelStyle={{ color: theme.colors.onPrimary }}
            />

            <Button
                mode="outlined"
                onPress={onCopyRecoveryCode}
                icon={({ size, color }) => <Copy size={size} color={color} />}
                style={styles.copyButton}
                contentStyle={styles.primaryButtonContent}
            >
                Copier le code
            </Button>

            <Snackbar
                visible={recoveryCodeCopied}
                onDismiss={() => {
                    /* Visibility reset by parent after RECOVERY_CODE_COPIED_DURATION_MS */
                }}
                duration={2000}
                style={{ marginBottom: 16 }}
            >
                {SNACKBAR_COPY_MESSAGE}
            </Snackbar>

            <Checkbox control={control} name="savedCodeChecked" label="I have saved this code" labelStyle={styles.checkboxLabel} />
            {error ? (
                <HelperText type="error" visible>
                    {error}
                </HelperText>
            ) : null}
            <Button
                mode="contained"
                onPress={() => onboardingState.finalize(!!getValues('savedCodeChecked'))}
                style={[styles.primaryButton, { backgroundColor: actions.success.background }]}
                contentStyle={styles.primaryButtonContent}
            >
                Finish
            </Button>
        </>
    );
}
