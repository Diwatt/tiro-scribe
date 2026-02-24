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
    onboarding: {
        /**
         * Step {current} of {total}
         * @param {unknown} current
         * @param {unknown} total
         */
        step: RequiredParams<'current' | 'total'>;
        /** About you */
        aboutYou: string;
        /** So we can tailor the app to your practice. */
        aboutYouDesc: string;
        /** Languages */
        languages: string;
        /** Qualifications */
        qualifications: string;
        /** Search qualifications… */
        qualificationsPlaceholder: string;
        /** Experience (years) */
        experience: string;
        /** Therapy methods */
        methods: string;
        /** Search methods… */
        methodsPlaceholder: string;
        /** Continue */
        continue: string;
        /** Secure account */
        secureAccount: string;
        /** Your data is encrypted with this password. We never see it. */
        secureAccountDesc: string;
        /** Email */
        email: string;
        /** Password */
        password: string;
        /** Confirm password */
        confirmPassword: string;
        /** Back */
        back: string;
        /** Creating account… */
        creatingAccount: string;
        /** Account ready */
        accountReady: string;
        /** Save this recovery code... */
        recoveryDesc: string;
        /** Save my Recovery Kit */
        saveRecoveryKit: string;
        /** Generating… */
        recoveryKitPending: string;
        /** Copy code */
        copyCode: string;
        /** Code copied */
        codeCopied: string;
        /** I have saved this code */
        savedCodeChecked: string;
        /** Finish */
        finish: string;
        /** Voice calibration */
        voiceCalibration: string;
        /** Read this text to calibrate... */
        voiceCalibrationDesc: string;
        /** Start calibration */
        startCalibration: string;
        /** Please confirm you have saved your recovery code. */
        errorConfirmSaveCode: string;
        /** Session lost. Please start over. */
        errorSessionLost: string;
        /** Account creation failed. */
        errorAccountCreation: string;
        /** Voice calibration failed. */
        errorVoiceCalibration: string;
        /** Failed to save account. */
        errorSaveAccount: string;
        /** No recovery code available. */
        errorNoRecoveryCode: string;
    };
    recoveryKit: {
        /** Generating PDF… */
        generatingPdf: string;
        /** Recovery kit saved */
        saved: string;
        /** Your kit has been generated and shared. */
        savedMessage: string;
        /** Failed to generate or share recovery kit. */
        errorGeneric: string;
    };
    error: {
        /** Error */
        title: string;
    };
    device: {
        /** Device not supported */
        notSupported: string;
        /** Tiro Scribe requires a compatible device... */
        notSupportedMessage: string;
        /** iOS: 12.0+, 3.5GB+ RAM... */
        notSupportedHint: string;
    };
    settings: {
        /** Profile */
        profile: string;
        /** Therapist Profile */
        therapistProfile: string;
        /** Manage your profile information */
        therapistProfileDesc: string;
        /** Privacy & Security */
        privacySecurity: string;
        /** Privacy Settings */
        privacySettings: string;
        /** Configure data protection */
        privacySettingsDesc: string;
        /** Preferences */
        preferences: string;
        /** Notifications */
        notifications: string;
        /** Enable push notifications */
        notificationsDesc: string;
        /** Dark Mode */
        darkMode: string;
        /** Use dark theme */
        darkModeDesc: string;
        /** About */
        about: string;
        /** Version */
        version: string;
    };
    home: {
        /** Initializing inference engine… */
        initializingAi: string;
        /** Processing will be delayed until artifacts are ready. */
        processingDelayed: string;
    };
    transcript: {
        /** Transcript */
        title: string;
    };
    subjects: {
        /** Search subjects... */
        searchPlaceholder: string;
        /** Last encounter: */
        lastEncounter: string;
    };
    recordButton: {
        /** Record */
        record: string;
        /** Stop */
        stop: string;
    };
    activity: {
        /** Loading… */
        loading: string;
        /** Starting… */
        starting: string;
        /** Done */
        done: string;
        /** Warning */
        warning: string;
        /** An error occurred */
        error: string;
    };
    status: {
        /** Ready */
        readyTitle: string;
        /** No pending tasks. */
        readySubtitle: string;
    };
    download: {
        /** Downloading speaker identification model… */
        speakerModel: string;
        /** Downloading speaker identification model… {percentage}% */
        speakerModelProgress: RequiredParams<'percentage'>;
        /** Speaker model downloaded successfully */
        speakerModelSuccess: string;
        /** Failed to download speaker model */
        speakerModelError: string;
    };
    ui: {
        /** Interface language */
        language: string;
        /** Practice languages */
        practiceLanguages: string;
    };
};

export type TranslationFunctions = {
    onboarding: {
        /** Step {current} of {total} */
        step: (arg: { current: unknown; total: unknown }) => LocalizedString;
        /** About you */
        aboutYou: () => LocalizedString;
        /** So we can tailor the app to your practice. */
        aboutYouDesc: () => LocalizedString;
        /** Languages */
        languages: () => LocalizedString;
        /** Qualifications */
        qualifications: () => LocalizedString;
        /** Search qualifications… */
        qualificationsPlaceholder: () => LocalizedString;
        /** Experience (years) */
        experience: () => LocalizedString;
        /** Therapy methods */
        methods: () => LocalizedString;
        /** Search methods… */
        methodsPlaceholder: () => LocalizedString;
        /** Continue */
        continue: () => LocalizedString;
        /** Secure account */
        secureAccount: () => LocalizedString;
        /** Your data is encrypted with this password. We never see it. */
        secureAccountDesc: () => LocalizedString;
        /** Email */
        email: () => LocalizedString;
        /** Password */
        password: () => LocalizedString;
        /** Confirm password */
        confirmPassword: () => LocalizedString;
        /** Back */
        back: () => LocalizedString;
        /** Creating account… */
        creatingAccount: () => LocalizedString;
        /** Account ready */
        accountReady: () => LocalizedString;
        /** Save this recovery code... */
        recoveryDesc: () => LocalizedString;
        /** Save my Recovery Kit */
        saveRecoveryKit: () => LocalizedString;
        /** Generating… */
        recoveryKitPending: () => LocalizedString;
        /** Copy code */
        copyCode: () => LocalizedString;
        /** Code copied */
        codeCopied: () => LocalizedString;
        /** I have saved this code */
        savedCodeChecked: () => LocalizedString;
        /** Finish */
        finish: () => LocalizedString;
        /** Voice calibration */
        voiceCalibration: () => LocalizedString;
        /** Read this text to calibrate... */
        voiceCalibrationDesc: () => LocalizedString;
        /** Start calibration */
        startCalibration: () => LocalizedString;
        /** Please confirm you have saved your recovery code. */
        errorConfirmSaveCode: () => LocalizedString;
        /** Session lost. Please start over. */
        errorSessionLost: () => LocalizedString;
        /** Account creation failed. */
        errorAccountCreation: () => LocalizedString;
        /** Voice calibration failed. */
        errorVoiceCalibration: () => LocalizedString;
        /** Failed to save account. */
        errorSaveAccount: () => LocalizedString;
        /** No recovery code available. */
        errorNoRecoveryCode: () => LocalizedString;
    };
    recoveryKit: {
        /** Generating PDF… */
        generatingPdf: () => LocalizedString;
        /** Recovery kit saved */
        saved: () => LocalizedString;
        /** Your kit has been generated and shared. */
        savedMessage: () => LocalizedString;
        /** Failed to generate or share recovery kit. */
        errorGeneric: () => LocalizedString;
    };
    error: {
        /** Error */
        title: () => LocalizedString;
    };
    device: {
        /** Device not supported */
        notSupported: () => LocalizedString;
        /** Tiro Scribe requires a compatible device... */
        notSupportedMessage: () => LocalizedString;
        /** iOS: 12.0+, 3.5GB+ RAM... */
        notSupportedHint: () => LocalizedString;
    };
    settings: {
        /** Profile */
        profile: () => LocalizedString;
        /** Therapist Profile */
        therapistProfile: () => LocalizedString;
        /** Manage your profile information */
        therapistProfileDesc: () => LocalizedString;
        /** Privacy & Security */
        privacySecurity: () => LocalizedString;
        /** Privacy Settings */
        privacySettings: () => LocalizedString;
        /** Configure data protection */
        privacySettingsDesc: () => LocalizedString;
        /** Preferences */
        preferences: () => LocalizedString;
        /** Notifications */
        notifications: () => LocalizedString;
        /** Enable push notifications */
        notificationsDesc: () => LocalizedString;
        /** Dark Mode */
        darkMode: () => LocalizedString;
        /** Use dark theme */
        darkModeDesc: () => LocalizedString;
        /** About */
        about: () => LocalizedString;
        /** Version */
        version: () => LocalizedString;
    };
    home: {
        /** Initializing inference engine… */
        initializingAi: () => LocalizedString;
        /** Processing will be delayed until artifacts are ready. */
        processingDelayed: () => LocalizedString;
    };
    transcript: {
        /** Transcript */
        title: () => LocalizedString;
    };
    subjects: {
        /** Search subjects... */
        searchPlaceholder: () => LocalizedString;
        /** Last encounter: */
        lastEncounter: () => LocalizedString;
    };
    recordButton: {
        /** Record */
        record: () => LocalizedString;
        /** Stop */
        stop: () => LocalizedString;
    };
    activity: {
        /** Loading… */
        loading: () => LocalizedString;
        /** Starting… */
        starting: () => LocalizedString;
        /** Done */
        done: () => LocalizedString;
        /** Warning */
        warning: () => LocalizedString;
        /** An error occurred */
        error: () => LocalizedString;
    };
    status: {
        /** Ready */
        readyTitle: () => LocalizedString;
        /** No pending tasks. */
        readySubtitle: () => LocalizedString;
    };
    download: {
        /** Downloading speaker identification model… */
        speakerModel: () => LocalizedString;
        /** Downloading speaker identification model… {percentage}% */
        speakerModelProgress: RequiredParams<'percentage'>;
        /** Speaker model downloaded successfully */
        speakerModelSuccess: () => LocalizedString;
        /** Failed to download speaker model */
        speakerModelError: () => LocalizedString;
    };
    ui: {
        /** Interface language */
        language: () => LocalizedString;
        /** Practice languages */
        practiceLanguages: () => LocalizedString;
    };
};

export type Formatters = Record<string, never>;
