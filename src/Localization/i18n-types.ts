/**
 * i18n types (camelCase keys). Manually maintained; running `pnpm typesafe-i18n` may overwrite.
 */
import type { BaseTranslation as BaseTranslationType, LocalizedString, RequiredParams } from 'typesafe-i18n';

export type BaseTranslation = BaseTranslationType;
export type BaseLocale = 'en';

export type Locales = 'en' | 'fr';

export type Translation = RootTranslation;

export type Translations = RootTranslation;

type RootTranslation = {
    /**
     * Step {current} of {total}
     * @param {unknown} current
     * @param {unknown} total
     */
    onboardingStep: RequiredParams<'current' | 'total'>;
    /** About you */
    onboardingAboutYou: string;
    /** So we can tailor the app to your practice. */
    onboardingAboutYouDesc: string;
    /** Languages */
    onboardingLanguages: string;
    /** Qualifications */
    onboardingQualifications: string;
    /** Search qualifications… */
    onboardingQualificationsPlaceholder: string;
    /** Experience (years) */
    onboardingExperience: string;
    /** Therapy methods */
    onboardingMethods: string;
    /** Search methods… */
    onboardingMethodsPlaceholder: string;
    /** Continue */
    onboardingContinue: string;
    /** Interface language */
    uiLanguage: string;
    /** Practice languages */
    practiceLanguages: string;
    /** Secure account */
    onboardingSecureAccount: string;
    /** Your data is encrypted with this password. We never see it. */
    onboardingSecureAccountDesc: string;
    /** Email */
    onboardingEmail: string;
    /** Password */
    onboardingPassword: string;
    /** Confirm password */
    onboardingConfirmPassword: string;
    /** Back */
    onboardingBack: string;
    /** Creating account… */
    onboardingCreatingAccount: string;
    /** Account ready */
    onboardingAccountReady: string;
    /** Save this recovery code... */
    onboardingRecoveryDesc: string;
    /** Save my Recovery Kit */
    onboardingSaveRecoveryKit: string;
    /** Generating… */
    onboardingRecoveryKitPending: string;
    /** Copy code */
    onboardingCopyCode: string;
    /** Code copied */
    onboardingCodeCopied: string;
    /** I have saved this code */
    onboardingSavedCodeChecked: string;
    /** Finish */
    onboardingFinish: string;
    /** Voice calibration */
    onboardingVoiceCalibration: string;
    /** Read this text to calibrate... */
    onboardingVoiceCalibrationDesc: string;
    /** Start calibration */
    onboardingStartCalibration: string;
    /** Generating PDF… */
    recoveryKitGeneratingPdf: string;
    /** Recovery kit saved */
    recoveryKitSaved: string;
    /** Your kit has been generated and shared. */
    recoveryKitSavedMessage: string;
    /** Error */
    errorTitle: string;
    /** Failed to generate or share recovery kit. */
    recoveryKitErrorGeneric: string;
    /** Please confirm you have saved your recovery code. */
    onboardingErrorConfirmSaveCode: string;
    /** Session lost. Please start over. */
    onboardingErrorSessionLost: string;
    /** Account creation failed. */
    onboardingErrorAccountCreation: string;
    /** Voice calibration failed. */
    onboardingErrorVoiceCalibration: string;
    /** Failed to save account. */
    onboardingErrorSaveAccount: string;
    /** No recovery code available. */
    onboardingErrorNoRecoveryCode: string;
    /** Device not supported */
    deviceNotSupported: string;
    /** Tiro Scribe requires a compatible device... */
    deviceNotSupportedMessage: string;
    /** iOS: 12.0+, 3.5GB+ RAM... */
    deviceNotSupportedHint: string;
    /** Profile */
    settingsProfile: string;
    /** Therapist Profile */
    settingsTherapistProfile: string;
    /** Manage your profile information */
    settingsTherapistProfileDesc: string;
    /** Privacy & Security */
    settingsPrivacySecurity: string;
    /** Privacy Settings */
    settingsPrivacySettings: string;
    /** Configure data protection */
    settingsPrivacySettingsDesc: string;
    /** Preferences */
    settingsPreferences: string;
    /** Notifications */
    settingsNotifications: string;
    /** Enable push notifications */
    settingsNotificationsDesc: string;
    /** Dark Mode */
    settingsDarkMode: string;
    /** Use dark theme */
    settingsDarkModeDesc: string;
    /** About */
    settingsAbout: string;
    /** Version */
    settingsVersion: string;
    /** Initializing AI Engine… */
    homeInitializingAi: string;
    /** Processing will be delayed until models are ready. */
    homeProcessingDelayed: string;
    /** Transcript */
    transcriptTitle: string;
    /** Search subjects... */
    subjectsSearchPlaceholder: string;
    /** Last encounter: */
    subjectsLastEncounter: string;
    /** Record */
    recordButtonRecord: string;
    /** Stop */
    recordButtonStop: string;
    /** Loading… */
    activityLoading: string;
    /** Done */
    activityDone: string;
    /** Warning */
    activityWarning: string;
    /** An error occurred */
    activityError: string;
    /** Ready */
    statusReadyTitle: string;
    /** No pending tasks. */
    statusReadySubtitle: string;
};

export type TranslationFunctions = {
    /** Step {current} of {total} */
    onboardingStep: (arg: { current: unknown; total: unknown }) => LocalizedString;
    /** About you */
    onboardingAboutYou: () => LocalizedString;
    /** So we can tailor the app to your practice. */
    onboardingAboutYouDesc: () => LocalizedString;
    /** Languages */
    onboardingLanguages: () => LocalizedString;
    /** Qualifications */
    onboardingQualifications: () => LocalizedString;
    /** Search qualifications… */
    onboardingQualificationsPlaceholder: () => LocalizedString;
    /** Experience (years) */
    onboardingExperience: () => LocalizedString;
    /** Therapy methods */
    onboardingMethods: () => LocalizedString;
    /** Search methods… */
    onboardingMethodsPlaceholder: () => LocalizedString;
    /** Continue */
    onboardingContinue: () => LocalizedString;
    /** Interface language */
    uiLanguage: () => LocalizedString;
    /** Practice languages */
    practiceLanguages: () => LocalizedString;
    onboardingSecureAccount: () => LocalizedString;
    onboardingSecureAccountDesc: () => LocalizedString;
    onboardingEmail: () => LocalizedString;
    onboardingPassword: () => LocalizedString;
    onboardingConfirmPassword: () => LocalizedString;
    onboardingBack: () => LocalizedString;
    onboardingCreatingAccount: () => LocalizedString;
    onboardingAccountReady: () => LocalizedString;
    onboardingRecoveryDesc: () => LocalizedString;
    onboardingSaveRecoveryKit: () => LocalizedString;
    onboardingRecoveryKitPending: () => LocalizedString;
    onboardingCopyCode: () => LocalizedString;
    onboardingCodeCopied: () => LocalizedString;
    onboardingSavedCodeChecked: () => LocalizedString;
    onboardingFinish: () => LocalizedString;
    onboardingVoiceCalibration: () => LocalizedString;
    onboardingVoiceCalibrationDesc: () => LocalizedString;
    onboardingStartCalibration: () => LocalizedString;
    recoveryKitGeneratingPdf: () => LocalizedString;
    recoveryKitSaved: () => LocalizedString;
    recoveryKitSavedMessage: () => LocalizedString;
    errorTitle: () => LocalizedString;
    recoveryKitErrorGeneric: () => LocalizedString;
    onboardingErrorConfirmSaveCode: () => LocalizedString;
    onboardingErrorSessionLost: () => LocalizedString;
    onboardingErrorAccountCreation: () => LocalizedString;
    onboardingErrorVoiceCalibration: () => LocalizedString;
    onboardingErrorSaveAccount: () => LocalizedString;
    onboardingErrorNoRecoveryCode: () => LocalizedString;
    deviceNotSupported: () => LocalizedString;
    deviceNotSupportedMessage: () => LocalizedString;
    deviceNotSupportedHint: () => LocalizedString;
    settingsProfile: () => LocalizedString;
    settingsTherapistProfile: () => LocalizedString;
    settingsTherapistProfileDesc: () => LocalizedString;
    settingsPrivacySecurity: () => LocalizedString;
    settingsPrivacySettings: () => LocalizedString;
    settingsPrivacySettingsDesc: () => LocalizedString;
    settingsPreferences: () => LocalizedString;
    settingsNotifications: () => LocalizedString;
    settingsNotificationsDesc: () => LocalizedString;
    settingsDarkMode: () => LocalizedString;
    settingsDarkModeDesc: () => LocalizedString;
    settingsAbout: () => LocalizedString;
    settingsVersion: () => LocalizedString;
    homeInitializingAi: () => LocalizedString;
    homeProcessingDelayed: () => LocalizedString;
    transcriptTitle: () => LocalizedString;
    subjectsSearchPlaceholder: () => LocalizedString;
    subjectsLastEncounter: () => LocalizedString;
    recordButtonRecord: () => LocalizedString;
    recordButtonStop: () => LocalizedString;
    activityLoading: () => LocalizedString;
    activityDone: () => LocalizedString;
    activityWarning: () => LocalizedString;
    activityError: () => LocalizedString;
    statusReadyTitle: () => LocalizedString;
    statusReadySubtitle: () => LocalizedString;
};

export type Formatters = Record<string, never>;
