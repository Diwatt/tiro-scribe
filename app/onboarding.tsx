/**
 * Onboarding route – Multi-step form: Profile → Security → Voice → atomic account creation.
 * On complete, runs startupOrchestrator.runSequence(); _layout redirects to /main.
 *
 * Spec path: src/app/(public)/onboarding.tsx — implemented here for Expo Router (app/).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTheme,
  TextInput,
  Button,
  Checkbox,
  ProgressBar,
  HelperText,
  Chip,
  SegmentedButtons,
  Surface,
} from 'react-native-paper';
import { Mic } from 'lucide-react-native';
import { registry } from '@/Database/Registry';
import { Therapist } from '@/Entity/Therapist';
import { TherapistVault } from '@/Security';
import { audioRecording } from '@/Service';
import { startupOrchestrator } from '@/State/StartupOrchestrator';
import type { ExtendedTheme } from '@/theme/AppTheme';

const QUALIFICATIONS = [
  { value: 'Psychiatrist', label: 'Psychiatrist' },
  { value: 'Psychologist', label: 'Psychologist' },
  { value: 'Other', label: 'Other' },
] as const;

const THERAPY_METHODS = ['CBT', 'Psychoanalysis', 'Systemic', 'EMDR'] as const;

const VOICE_PHRASE =
  'Je certifie être le thérapeute vérifié pour cet appareil sécurisé.';

const RECORD_DURATION_MS = 5000;
const BIocode_DIM = 512;

function generateMockRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
  return `${part()}-${part()}-${part()}`;
}

const defaultFormData = {
  languages: ['fr'] as string[],
  qualification: '' as string,
  experience: '' as string,
  methods: [] as string[],
  email: '' as string,
  password: '' as string,
  confirmPassword: '' as string,
  biocode: [] as number[],
};

export default function OnboardingScreen(): React.JSX.Element {
  const theme = useTheme<ExtendedTheme>();
  const actions = theme.colors.actions;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(defaultFormData);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryCodePreview] = useState(() => generateMockRecoveryCode());
  const [recoveryCodeStoredChecked, setRecoveryCodeStoredChecked] =
    useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const progress = step / 3;

  const updateForm = useCallback(
    <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleMethod = useCallback((method: string) => {
    setFormData((prev) => {
      const methods = prev.methods.includes(method)
        ? prev.methods.filter((m) => m !== method)
        : [...prev.methods, method];
      return { ...prev, methods };
    });
  }, []);

  // Step 1 validation
  const step1Valid =
    formData.qualification.trim() !== '' &&
    formData.experience.trim() !== '' &&
    /^\d+$/.test(formData.experience) &&
    formData.methods.length > 0;

  // Step 2 validation
  const step2Valid =
    formData.email.trim() !== '' &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword &&
    recoveryCodeStoredChecked;

  // 5s recording countdown
  useEffect(() => {
    if (!isRecording) {
      setRecordingProgress(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / RECORD_DURATION_MS, 1);
      setRecordingProgress(p);
      if (p >= 1) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    try {
      setIsRecording(true);
      await audioRecording.startRecording();
      await new Promise((r) => setTimeout(r, RECORD_DURATION_MS));
      await audioRecording.stopRecording();
      setIsRecording(false);
      setRecordingProgress(1);
      // Simulate inference (1s) then random 512-float vector
      await new Promise((r) => setTimeout(r, 1000));
      const vector = Array.from({ length: BIocode_DIM }, () =>
        Math.random() * 2 - 1,
      );
      updateForm('biocode', vector);
      // Auto-submit
      await handleSubmit(vector);
    } catch (e) {
      setIsRecording(false);
      setError(e instanceof Error ? e.message : 'Recording failed.');
    }
  }, [handleSubmit]);

  const handleSubmit = useCallback(
    async (biocodeVector?: number[]) => {
      const vector = biocodeVector ?? formData.biocode;
      if (vector.length === 0) return;

      setError(null);
      setIsSubmitting(true);
      try {
        const { therapist } =
          await TherapistVault.initializeAccount(
            formData.email.trim(),
            formData.password,
            null,
            formData.languages,
            vector,
          );

        const repo = registry.getRepository(Therapist);
        const therapyMethodValue =
          formData.methods.length > 0 ? formData.methods.join(',') : null;
        const yearsNum = formData.experience.trim()
          ? parseInt(formData.experience, 10)
          : null;

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
          qualification: formData.qualification || null,
          yearsOfExperience: yearsNum,
          therapyMethod: therapyMethodValue,
        });

        startupOrchestrator.runSequence();
        // _layout observes state and replaces with /main when READY
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Account creation failed.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData],
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProgressBar
          progress={progress}
          color={actions.primary.background}
          style={styles.progressBar}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : null}

          {/* Step 1: Professional Profile */}
          {step === 1 && (
            <>
              <Text
                style={[styles.stepTitle, { color: theme.colors.onBackground }]}
              >
                Professional profile
              </Text>
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Qualification
              </Text>
              <SegmentedButtons
                buttons={QUALIFICATIONS.map((q) => ({
                  value: q.value,
                  label: q.label,
                }))}
                value={formData.qualification}
                onValueChange={(v) => updateForm('qualification', v)}
                style={styles.segmented}
              />
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Experience (years)
              </Text>
              <TextInput
                value={formData.experience}
                onChangeText={(v) => updateForm('experience', v)}
                keyboardType="number-pad"
                mode="outlined"
                placeholder="e.g. 5"
                style={styles.input}
              />
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Therapy methods
              </Text>
              <View style={styles.chipRow}>
                {THERAPY_METHODS.map((m) => (
                  <Chip
                    key={m}
                    selected={formData.methods.includes(m)}
                    onPress={() => toggleMethod(m)}
                    style={styles.chip}
                  >
                    {m}
                  </Chip>
                ))}
              </View>
            </>
          )}

          {/* Step 2: Secure Vault */}
          {step === 2 && (
            <>
              <Text
                style={[styles.stepTitle, { color: theme.colors.onBackground }]}
              >
                Secure vault
              </Text>
              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(v) => updateForm('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={(v) => updateForm('password', v)}
                secureTextEntry
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Confirm password"
                value={formData.confirmPassword}
                onChangeText={(v) => updateForm('confirmPassword', v)}
                secureTextEntry
                mode="outlined"
                style={styles.input}
              />
              <Surface
                style={[
                  styles.recoveryBox,
                  {
                    backgroundColor: theme.colors.statusWarning.background,
                  },
                ]}
                elevation={0}
              >
                <Text
                  style={[
                    styles.recoveryLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Recovery code (store safely)
                </Text>
                <Text
                  selectable
                  style={[
                    styles.recoveryCode,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {recoveryCodePreview}
                </Text>
              </Surface>
              <View style={styles.checkboxRow}>
                <Checkbox
                  status={
                    recoveryCodeStoredChecked ? 'checked' : 'unchecked'
                  }
                  onPress={() =>
                    setRecoveryCodeStoredChecked(!recoveryCodeStoredChecked)
                  }
                />
                <Text
                  style={[
                    styles.checkboxLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  I certify that I have safely stored this Recovery Code. It is
                  the ONLY way to decrypt my patients' data if I lose my
                  password.
                </Text>
              </View>
            </>
          )}

          {/* Step 3: Voice Calibration */}
          {step === 3 && (
            <>
              <Text
                style={[styles.stepTitle, { color: theme.colors.onBackground }]}
              >
                Voice calibration
              </Text>
              <Text
                style={[
                  styles.voicePhrase,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {VOICE_PHRASE}
              </Text>
              <View style={styles.micContainer}>
                <Pressable
                  onPress={handleStartRecording}
                  disabled={isRecording || isSubmitting}
                  style={({ pressed }) => [
                    styles.micButton,
                    {
                      backgroundColor: isRecording
                        ? theme.colors.statusError.background
                        : actions.critical.background,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Mic
                    size={64}
                    color={theme.colors.secureSessionButton.iconColor}
                  />
                </Pressable>
                {isRecording && (
                  <ProgressBar
                    progress={recordingProgress}
                    color={theme.colors.primary}
                    style={styles.recordProgress}
                  />
                )}
                {isRecording && (
                  <Text
                    style={[
                      styles.countdown,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {Math.ceil((1 - recordingProgress) * 5)}s
                  </Text>
                )}
              </View>
              {isSubmitting && (
                <Text
                  style={[
                    styles.hint,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Creating your account…
                </Text>
              )}
            </>
          )}
        </ScrollView>

        {/* Bottom navigation */}
        <View
          style={[
            styles.footer,
            { borderTopColor: theme.colors.outlineVariant },
          ]}
        >
          <Button
            mode="outlined"
            onPress={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            style={styles.footerBtn}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button
              mode="contained"
              onPress={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !step1Valid) || (step === 2 && !step2Valid)
              }
              style={[
                styles.footerBtn,
                { backgroundColor: actions.primary.background },
              ]}
            >
              Next
            </Button>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  progressBar: {
    height: 4,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
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
  segmented: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    marginRight: 0,
  },
  recoveryBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  recoveryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  recoveryCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  voicePhrase: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  micContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordProgress: {
    width: '100%',
    height: 6,
    marginTop: 16,
  },
  countdown: {
    marginTop: 8,
    fontSize: 18,
  },
  hint: {
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    minWidth: 100,
  },
});
