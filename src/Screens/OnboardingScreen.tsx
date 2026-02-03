/**
 * OnboardingScreen – The Wizard
 * Multi-step form: Language & Credentials → Recovery Code → Voice Calibration.
 * Models are NOT downloaded here. Final step resets stack to Home.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import {
    useTheme,
    TextInput,
    Button,
    Checkbox,
    ProgressBar,
    HelperText,
} from 'react-native-paper';
import { registry } from '../Database/Registry';
import { Therapist } from '../Entity/Therapist';
import { TherapistVault } from '../Security';
import { voiceCalibration } from '../Service';
import type { ExtendedTheme } from '../theme/AppTheme';

const LANGUAGES = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
];

const STEPS = 3;

export interface OnboardingScreenProps {
    onComplete?: () => void;
}

function passwordStrength(password: string): number {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    return Math.min(s, 4) / 4;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();

    const [step, setStep] = useState(1);
    const [language, setLanguage] = useState<string>('fr');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [savedCodeChecked, setSavedCodeChecked] = useState(false);
    const [voiceLoading, setVoiceLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const actions = theme.colors.actions;
    const progress = step / STEPS;

    const handleStep1Next = useCallback(async () => {
        setError(null);
        if (!email.trim()) {
            setError('Please enter your email.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        try {
            const { therapist, recoveryCode: code } =
                await TherapistVault.initializeAccount(
                email.trim(),
                password,
                null,
                [language],
            );
            setRecoveryCode(code);
            const repo = registry.getRepository(Therapist);
            repo.persist({
                uuid: therapist.getUuid(),
                email: therapist.getEmail(),
                name: therapist.getName(),
                passwordHash: therapist.getPasswordHash(),
                localKeyId: therapist.getLocalKeyId(),
                encryptedMasterKeyPrimary: therapist.getEncryptedMasterKeyPrimary(),
                encryptedMasterKeyRecovery: therapist.getEncryptedMasterKeyRecovery(),
                recoveryCodeHash: therapist.getRecoveryCodeHash(),
                masterKeyCheckHash: therapist.getMasterKeyCheckHash(),
                languages: therapist.getLanguages(),
                biocodeEmbedding: therapist.getBiocodeEmbedding(),
            });
            setStep(2);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Account creation failed.');
        }
    }, [email, password, confirmPassword, language]);

    const handleStep2Next = useCallback(() => {
        setError(null);
        if (!savedCodeChecked) {
            setError('Please confirm you have saved your recovery code.');
            return;
        }
        setStep(3);
    }, [savedCodeChecked]);

    const handleStep3Finish = useCallback(async () => {
        setError(null);
        setVoiceLoading(true);
        try {
            const vector = await voiceCalibration.run();
            const therapistRepo = registry.getRepository(Therapist);
            const therapists = therapistRepo.findAll();
            const current = therapists[0];
            if (current) {
                current.setBiocodeEmbedding(JSON.stringify(vector));
                therapistRepo.persist({
                    uuid: current.getUuid(),
                    biocodeEmbedding: current.getBiocodeEmbedding(),
                });
            }
            setVoiceLoading(false);
            onComplete?.();
        } catch (e) {
            setVoiceLoading(false);
            setError(e instanceof Error ? e.message : 'Voice calibration failed.');
        }
    }, [onComplete]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ProgressBar progress={progress} color={actions.primary.background} style={styles.progress} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {error ? (
                    <HelperText type="error" visible={!!error}>
                        {error}
                    </HelperText>
                ) : null}

                {step === 1 && (
                    <>
                        <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
                            Language & account
                        </Text>
                        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                            Language
                        </Text>
                        <View style={styles.languageRow}>
                            {LANGUAGES.map((opt) => (
                                <Button
                                    key={opt.value}
                                    mode={language === opt.value ? 'contained' : 'outlined'}
                                    onPress={() => setLanguage(opt.value)}
                                    style={styles.langButton}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </View>
                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            mode="outlined"
                            style={styles.input}
                        />
                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            mode="outlined"
                            style={styles.input}
                        />
                        <ProgressBar
                            progress={passwordStrength(password)}
                            color={theme.colors.primary}
                            style={styles.strengthBar}
                        />
                        <TextInput
                            label="Confirm password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            mode="outlined"
                            style={styles.input}
                        />
                        <Button
                            mode="contained"
                            onPress={handleStep1Next}
                            style={[styles.primaryButton, { backgroundColor: actions.primary.background }]}
                        >
                            Continue
                        </Button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
                            Save your recovery code
                        </Text>
                        <View style={[styles.codeBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Text selectable style={[styles.codeText, { color: theme.colors.onSurface }]}>
                                {recoveryCode}
                            </Text>
                        </View>
                        <View style={styles.checkboxRow}>
                            <Checkbox
                                status={savedCodeChecked ? 'checked' : 'unchecked'}
                                onPress={() => setSavedCodeChecked(!savedCodeChecked)}
                            />
                            <Text style={[styles.checkboxLabel, { color: theme.colors.onSurface }]}>
                                I have saved my code
                            </Text>
                        </View>
                        <Button
                            mode="contained"
                            onPress={handleStep2Next}
                            style={[styles.primaryButton, { backgroundColor: actions.primary.background }]}
                        >
                            Continue
                        </Button>
                    </>
                )}

                {step === 3 && (
                    <>
                        <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
                            Voice calibration
                        </Text>
                        <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
                            Read this text to calibrate your secure profile. We'll record about 5 seconds,
                            then use the embedded speaker model to create your voice profile. The recording
                            is deleted immediately.
                        </Text>
                        {voiceLoading ? (
                            <ActivityIndicator size="large" style={styles.voiceLoader} />
                        ) : (
                            <Button
                                mode="contained"
                                onPress={handleStep3Finish}
                                style={[styles.primaryButton, { backgroundColor: actions.success.background }]}
                            >
                                Start calibration & finish
                            </Button>
                        )}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progress: {
        height: 4,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 48,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
    },
    languageRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    langButton: {
        flex: 1,
    },
    input: {
        marginBottom: 12,
    },
    strengthBar: {
        height: 4,
        marginBottom: 12,
    },
    primaryButton: {
        marginTop: 16,
    },
    codeBox: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    codeText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkboxLabel: {
        marginLeft: 8,
        fontSize: 16,
    },
    body: {
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 24,
    },
    voiceLoader: {
        marginVertical: 24,
    },
});
