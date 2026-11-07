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
        /** Grant microphone access */
        grantPermission: string;
        /** Microphone access is required for voice calibration. */
        permissionRequired: string;
        /** Please confirm you have saved your recovery code. */
        errorConfirmSaveCode: string;
        /** Session lost. Please start over. */
        errorSessionLost: string;
        /** Account creation failed. */
        errorAccountCreation: string;
        /** Voice calibration failed. */
        errorVoiceCalibration: string;
        /** Microphone permission was denied. */
        errorPermissionDenied: string;
        /** Recording in progress... */
        voiceRecording: string;
        /** Generating voice profile... */
        voiceProcessing: string;
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
        /** Setup incomplete */
        setupBannerTitle: string;
        /** Transcription unavailable */
        setupBannerSubtitle: string;
        /** Setup */
        setupButton: string;
        /** Dismiss */
        dismissButton: string;
        /** Important: Large Files Download */
        modalTitle: string;
        /** The app needs to download approximately {downloadSizeMB} MB of AI models to work offline. */
        modalDownloadDescription: RequiredParams<'downloadSizeMB'>;
        /** This includes models for transcription and voice activity detection. */
        modalModelsDescription: string;
        /** Wi-Fi connection required to download models */
        wifiRequired: string;
        /** Open Wi-Fi Settings */
        openWifiSettings: string;
        /** Download on cellular */
        downloadAnyway: string;
        /** Remind Me Later */
        remindMeLater: string;
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
        /** Downloading {capability}… */
        downloading: RequiredParams<'capability'>;
        /** Downloading… {percentage}% */
        downloadingProgress: RequiredParams<'percentage'>;
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
    shell: {
        /** Sessions */
        tabSessions: string;
        /** Subjects */
        tabSubjects: string;
        /** Settings */
        tabSettings: string;
        /** Back */
        back: string;
        /** Close */
        close: string;
        /** More actions */
        more: string;
        /** Export */
        export: string;
        /** Search in text */
        search: string;
        /** encrypted */
        encrypted: string;
    };
    launch: {
        /** Opening the encrypted vault… */
        opening: string;
        /** Takes notes. Never interprets. */
        tagline: string;
        /** Loading */
        loading: string;
    };
    unlock: {
        /** Tiro is locked */
        title: string;
        /** Your sessions stay encrypted until you unlock. */
        subtitle: string;
        /** Unlock with Face ID */
        faceId: string;
        /** Use the master password */
        password: string;
    };
    unlockVault: {
        /** Master password */
        masterPassword: string;
        /** Unlock */
        submit: string;
        /** Wrong master password. */
        errorWrongPassword: string;
        /** This device cannot read its security keyfile. */
        errorKeyfile: string;
    };
    incompatible: {
        /** This phone cannot run Tiro */
        title: string;
        /** Transcription runs entirely on the device. It needs a recent phone. */
        subtitle: string;
        /** Requirement */
        requirement: string;
        /** This phone */
        yours: string;
        /** Recommended phones */
        recommended: string;
    };
    welcome: {
        /** Your sessions, transcribed without leaving your phone */
        title: string;
        /** Nothing leaves the phone */
        promiseLocalTitle: string;
        /** Recording, transcription and storage happen here, encrypted. */
        promiseLocalBody: string;
        /** Transcribed later */
        promiseLaterTitle: string;
        /** Record now; Tiro transcribes while the phone charges. */
        promiseLaterBody: string;
        /** No audio is kept */
        promiseAudioTitle: string;
        /** Encrypted audio is destroyed as soon as it is transcribed. */
        promiseAudioBody: string;
        /** Get started */
        start: string;
        /** I have a recovery kit */
        restore: string;
    };
    restoreVault: {
        /** Restore your vault */
        title: string;
        /** Enter the recovery code from your kit and choose a new master password. */
        subtitle: string;
        /** Recovery code */
        codeLabel: string;
        /** New master password */
        passwordLabel: string;
        /** Confirm the new password */
        confirmLabel: string;
        /** Restore my vault */
        submit: string;
        /** Back */
        back: string;
        /** No vault found on this device. */
        errorNoVault: string;
        /** This recovery code does not match the vault on this device. */
        errorInvalidCode: string;
        /** Failed to restore the vault. */
        errorGeneric: string;
    };
    vault: {
        /** Step {current} · Your vault */
        step: RequiredParams<'current'>;
        /** Step {current} of {total} */
        progress: RequiredParams<'current' | 'total'>;
        /** Create your vault */
        title: string;
        /** Used to secure, back up and restore your sessions. Stays on this phone. */
        subtitle: string;
        /** Session languages */
        languages: string;
        /** Other… */
        other: string;
        /** Email */
        email: string;
        /** Master password */
        password: string;
        /** Confirmation */
        confirm: string;
        /** Strong · add a word to make it very strong */
        strong: string;
        /** Nobody can reset this password. Without it or your kit, the data is lost. */
        warning: string;
        /** Create my vault */
        create: string;
        /** Too weak */
        strength0: string;
        /** Weak · add a few words */
        strength1: string;
        /** Medium · add a word to make it strong */
        strength2: string;
        /** Strong */
        strength3: string;
        /** Creating the vault… */
        creating: string;
    };
    kitStep: {
        /** Step {current} · Backup */
        step: RequiredParams<'current'>;
        /** Keep your recovery kit */
        title: string;
        /** The only way back in if you forget your master password. */
        subtitle: string;
        /** Print */
        print: string;
        /** Copy */
        copy: string;
        /** I stored it somewhere safe */
        stored: string;
        /** Continue */
        continue: string;
        /** Copied */
        copied: string;
        /** Save as PDF */
        share: string;
    };
    models: {
        /** Step {current} · On-device intelligence */
        step: RequiredParams<'current'>;
        /** Installing the models */
        title: string;
        /** Downloaded once. Afterwards everything works offline. */
        subtitle: string;
        /** Transcription */
        transcription: string;
        /** Voices and speakers */
        voice: string;
        /** Mini summary */
        summary: string;
        /** On Wi-Fi · you can already record */
        wifi: string;
        /** Enter Tiro */
        enter: string;
    };
    homeScreen: {
        /** Sessions */
        title: string;
        /** On the device */
        onDevice: string;
        /** Start a session */
        start: string;
        /** Microphone ready · transcribed later, while charging */
        startDetail: string;
        /** To transcribe */
        toTranscribe: string;
        /** See all */
        seeAll: string;
        /** Running · {percent}% */
        running: RequiredParams<'percent'>;
        /** {count} waiting */
        waiting: RequiredParams<'count'>;
        /** At next charge */
        nextCharge: string;
        /** Recent */
        recent: string;
        /** Your sessions will appear here once recorded. */
        empty: string;
        /** Models are not installed */
        setupTitle: string;
        /** Transcription is unavailable until then. */
        setupBody: string;
        /** Install */
        setupAction: string;
        /** Your first session */
        emptyTitle: string;
        /** Sessions will appear here. Here is how it goes: */
        emptyBody: string;
        /** Record */
        emptyRecordTitle: string;
        /** Place the phone between you, then forget it. */
        emptyRecordBody: string;
        /** Plug in at night */
        emptyChargeTitle: string;
        /** Tiro transcribes while charging, then destroys the audio. */
        emptyChargeBody: string;
        /** Read it back */
        emptyReadTitle: string;
        /** Transcript, your notes and a mini summary on demand. */
        emptyReadBody: string;
    };
    preSession: {
        /** Ready to record */
        title: string;
        /** With whom? */
        who: string;
        /** Recognise by voice */
        auto: string;
        /** Choose the subject */
        manual: string;
        /** Tiro identifies the subject during analysis. You confirm if the voice is new. */
        autoHint: string;
        /** Change */
        change: string;
        /** Last time: */
        lastTime: string;
        /** Do not disturb */
        doNotDisturb: string;
        /** Silences calls and notifications */
        doNotDisturbDetail: string;
        /** Start recording */
        start: string;
        /** Place the phone between you. Encrypted, nothing leaves. */
        footnote: string;
    };
    recording: {
        /** Encrypted recording */
        badge: string;
        /** since {time} */
        since: RequiredParams<'time'>;
        /** You can turn the phone over. Recording continues with the screen off. */
        hint: string;
        /** Pause */
        pause: string;
        /** Resume */
        resume: string;
        /** Slide to end */
        slide: string;
    };
    sessionSaved: {
        /** Session saved */
        badge: string;
        /** Encrypted on this phone. Transcribed at next charge, then the audio is destroyed. */
        body: string;
        /** Plug in tonight · about {minutes} min of transcription */
        charge: RequiredParams<'minutes'>;
        /** Plug in tonight to start the transcription */
        chargeShort: string;
        /** Back to sessions */
        back: string;
    };
    queue: {
        /** To transcribe */
        title: string;
        /** Charging · transcription active */
        charging: string;
        /** About {minutes} min for {count} sessions */
        remaining: RequiredParams<'count' | 'minutes'>;
        /** Decrypt */
        decrypt: string;
        /** Voice */
        voice: string;
        /** Text */
        text: string;
        /** Speakers */
        speakers: string;
        /** Resumes where it stopped if the app closes */
        resumes: string;
        /** Next */
        next: string;
        /** pending */
        pending: string;
        /** Interrupted at {percent}% */
        interrupted: RequiredParams<'percent'>;
        /** Resume */
        resume: string;
        /** Encrypted audio is destroyed as soon as transcription ends. No copy remains. */
        destroyed: string;
    };
    session: {
        /** Session {rank} */
        nth: RequiredParams<'rank'>;
        /** {duration} · transcribed on the device · audio destroyed */
        meta: RequiredParams<'duration'>;
        /** Mini summary */
        summary: string;
        /** Written on the device, on demand */
        summaryDetail: string;
        /** Generate */
        generate: string;
        /** Subject */
        subject: string;
        /** You */
        you: string;
        /** {days} days after the previous one */
        sinceLast: RequiredParams<'days'>;
        /** Time */
        time: string;
        /** Duration */
        duration: string;
        /** by voice */
        recognised: string;
        /** Analysis done · audio destroyed */
        analysisDone: string;
        /** Details */
        details: string;
        /** Your session notes */
        notes: string;
        /** Edit */
        edit: string;
        /** Read the transcript */
        read: string;
        /** {lines} lines · 2 speakers */
        readDetail: RequiredParams<'lines'>;
    };
    analysis: {
        /** Analysis */
        title: string;
        /** Decryption */
        decrypt: string;
        /** In memory, never on disk */
        decryptDetail: string;
        /** Transcription */
        transcription: string;
        /** Speakers */
        speakers: string;
        /** You and one other voice */
        speakersDetail: string;
        /** Audio destroyed */
        destroyed: string;
        /** No sound of the session remains */
        destroyedDetail: string;
        /** Subject recognition */
        recognition: string;
        /** Your confirmation is needed */
        recognitionAsk: string;
        /** Mini summary */
        summary: string;
        /** On demand, from the session */
        summaryDetail: string;
        /** This voice matches no subject */
        unknownTitle: string;
        /** The closest is {name}, without certainty. Who is it? */
        unknownBody: RequiredParams<'name'>;
        /** New subject */
        newSubject: string;
        /** It is {name} */
        itIs: RequiredParams<'name'>;
        /** Other subject… */
        other: string;
        /** Recognition compares the voice print, never the content. You can correct it later. */
        footnote: string;
    };
    exportSheet: {
        /** Export the session */
        title: string;
        /** Format */
        format: string;
        /** PDF */
        pdf: string;
        /** Text */
        text: string;
        /** Content */
        content: string;
        /** Transcript */
        transcript: string;
        /** Mini summary */
        summary: string;
        /** Session notes */
        notes: string;
        /** Mask proper names */
        maskNames: string;
        /** Replaced by [NAME] */
        maskNamesDetail: string;
        /** Share… */
        share: string;
        /** The file leaves the phone only through the share sheet you choose. */
        footnote: string;
    };
    subjectList: {
        /** Subjects */
        title: string;
        /** Recognised by voice · no name stored */
        subtitle: string;
        /** Search a subject */
        search: string;
        /** By last session */
        byLast: string;
        /** Sort */
        sort: string;
        /** Subjects appear after their first analysed session. */
        empty: string;
    };
    subjectSheet: {
        /** Recognised by voice · {count} sessions */
        recognised: RequiredParams<'count'>;
        /** First session */
        firstSession: string;
        /** Average rhythm */
        rhythm: string;
        /** Total time */
        total: string;
        /** Average length */
        average: string;
        /** Last session */
        last: string;
        /** Open the session */
        open: string;
        /** Your note: {note} */
        yourNote: RequiredParams<'note'>;
        /** Previous sessions */
        previous: string;
    };
    settingsHome: {
        /** Settings */
        title: string;
        /** Your profile */
        profile: string;
        /** Security */
        security: string;
        /** Models and storage */
        storage: string;
        /** Processing */
        processing: string;
        /** Recalibrate my voice */
        voice: string;
        /** About */
        about: string;
        /** Tiro {version} · free, serverless. Nothing you record leaves this phone. */
        footer: RequiredParams<'version'>;
    };
    profilePage: {
        /** Your profile */
        title: string;
        /** Transcription */
        transcription: string;
        /** Session languages */
        languages: string;
        /** Account */
        account: string;
        /** Email */
        email: string;
        /** Used to secure and restore your vault. Stays on this phone. */
        footnote: string;
    };
    securityPage: {
        /** App access */
        access: string;
        /** Face ID on open */
        faceId: string;
        /** Auto-lock */
        autoLock: string;
        /** Encrypted vault */
        vault: string;
        /** Change master password */
        changePassword: string;
        /** Recovery kit */
        kit: string;
        /** Saved */
        kitSaved: string;
        /** Audio and transcripts are encrypted with AES-256 using a key kept in the phone secure chip. */
        footnote: string;
    };
    storagePage: {
        /** used by Tiro */
        used: string;
        /** Models */
        models: string;
        /** Sessions to transcribe (encrypted audio) */
        pending: string;
        /** Transcripts */
        transcripts: string;
        /** Installed models */
        installed: string;
        /** Transcription language */
        language: string;
        /** Transcription */
        transcription: string;
        /** Mini summary */
        summary: string;
        /** Voices and speakers */
        voice: string;
    };
    processingPage: {
        /** When to transcribe */
        when: string;
        /** While charging only */
        charging: string;
        /** Recommended · no battery impact */
        chargingDetail: string;
        /** While charging, at night */
        night: string;
        /** Between 10 pm and 7 am */
        nightDetail: string;
        /** As soon as possible */
        asap: string;
        /** May slow down and heat the phone */
        asapDetail: string;
        /** After transcription */
        after: string;
        /** Prepare the mini summary */
        prepare: string;
        /** Otherwise generated on demand */
        prepareDetail: string;
        /** Notify when ready */
        notify: string;
        /** Notification without session content */
        notifyDetail: string;
        /** In every case, encrypted audio is destroyed as soon as transcription ends. */
        footnote: string;
    };
    languageName: {
        /** French */
        fr: string;
        /** English */
        en: string;
        /** German */
        de: string;
        /** Spanish */
        es: string;
        /** Italian */
        it: string;
    };
    voiceStep: {
        /** Step {current} · Your voice */
        step: RequiredParams<'current'>;
        /** Read this text aloud */
        title: string;
        /** Tiro will tell your voice apart from your patients'. */
        subtitle: string;
        /** The North Wind and the Sun were disputing which was the stronger, when a traveller came along wrapped in a warm cloak. */
        passage: string;
        /** Your voice print never leaves this phone */
        footnote: string;
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
        /** Grant microphone access */
        grantPermission: () => LocalizedString;
        /** Microphone access is required for voice calibration. */
        permissionRequired: () => LocalizedString;
        /** Please confirm you have saved your recovery code. */
        errorConfirmSaveCode: () => LocalizedString;
        /** Session lost. Please start over. */
        errorSessionLost: () => LocalizedString;
        /** Account creation failed. */
        errorAccountCreation: () => LocalizedString;
        /** Voice calibration failed. */
        errorVoiceCalibration: () => LocalizedString;
        /** Microphone permission was denied. */
        errorPermissionDenied: () => LocalizedString;
        /** Recording in progress. */
        voiceRecording: () => LocalizedString;
        /** Generating voice profile. */
        voiceProcessing: () => LocalizedString;
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
        /** Setup incomplete */
        setupBannerTitle: () => LocalizedString;
        /** Transcription unavailable */
        setupBannerSubtitle: () => LocalizedString;
        /** Setup */
        setupButton: () => LocalizedString;
        /** Dismiss */
        dismissButton: () => LocalizedString;
        /** Important: Large Files Download */
        modalTitle: () => LocalizedString;
        /** The app needs to download approximately {downloadSizeMB} MB of AI models to work offline. */
        modalDownloadDescription: (arg0: { downloadSizeMB: unknown }) => LocalizedString;
        /** This includes models for transcription and voice activity detection. */
        modalModelsDescription: () => LocalizedString;
        /** Wi-Fi connection required to download models */
        wifiRequired: () => LocalizedString;
        /** Open Wi-Fi Settings */
        openWifiSettings: () => LocalizedString;
        /** Download on cellular */
        downloadAnyway: () => LocalizedString;
        /** Remind Me Later */
        remindMeLater: () => LocalizedString;
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
        /** Downloading {capability}… */
        downloading: (arg: { capability: unknown }) => LocalizedString;
        /** Downloading… {percentage}% */
        downloadingProgress: (arg: { percentage: unknown }) => LocalizedString;
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
    shell: {
        /** Sessions */
        tabSessions: () => LocalizedString;
        /** Subjects */
        tabSubjects: () => LocalizedString;
        /** Settings */
        tabSettings: () => LocalizedString;
        /** Back */
        back: () => LocalizedString;
        /** Close */
        close: () => LocalizedString;
        /** More actions */
        more: () => LocalizedString;
        /** Export */
        export: () => LocalizedString;
        /** Search in text */
        search: () => LocalizedString;
        /** encrypted */
        encrypted: () => LocalizedString;
    };
    launch: {
        /** Opening the encrypted vault… */
        opening: () => LocalizedString;
        /** Takes notes. Never interprets. */
        tagline: () => LocalizedString;
        /** Loading */
        loading: () => LocalizedString;
    };
    unlock: {
        /** Tiro is locked */
        title: () => LocalizedString;
        /** Your sessions stay encrypted until you unlock. */
        subtitle: () => LocalizedString;
        /** Unlock with Face ID */
        faceId: () => LocalizedString;
        /** Use the master password */
        password: () => LocalizedString;
    };
    unlockVault: {
        /** Master password */
        masterPassword: () => LocalizedString;
        /** Unlock */
        submit: () => LocalizedString;
        /** Wrong master password. */
        errorWrongPassword: () => LocalizedString;
        /** This device cannot read its security keyfile. */
        errorKeyfile: () => LocalizedString;
    };
    incompatible: {
        /** This phone cannot run Tiro */
        title: () => LocalizedString;
        /** Transcription runs entirely on the device. It needs a recent phone. */
        subtitle: () => LocalizedString;
        /** Requirement */
        requirement: () => LocalizedString;
        /** This phone */
        yours: () => LocalizedString;
        /** Recommended phones */
        recommended: () => LocalizedString;
    };
    welcome: {
        /** Your sessions, transcribed without leaving your phone */
        title: () => LocalizedString;
        /** Nothing leaves the phone */
        promiseLocalTitle: () => LocalizedString;
        /** Recording, transcription and storage happen here, encrypted. */
        promiseLocalBody: () => LocalizedString;
        /** Transcribed later */
        promiseLaterTitle: () => LocalizedString;
        /** Record now; Tiro transcribes while the phone charges. */
        promiseLaterBody: () => LocalizedString;
        /** No audio is kept */
        promiseAudioTitle: () => LocalizedString;
        /** Encrypted audio is destroyed as soon as it is transcribed. */
        promiseAudioBody: () => LocalizedString;
        /** Get started */
        start: () => LocalizedString;
        /** I have a recovery kit */
        restore: () => LocalizedString;
    };
    restoreVault: {
        /** Restore your vault */
        title: () => LocalizedString;
        /** Enter the recovery code from your kit and choose a new master password. */
        subtitle: () => LocalizedString;
        /** Recovery code */
        codeLabel: () => LocalizedString;
        /** New master password */
        passwordLabel: () => LocalizedString;
        /** Confirm the new password */
        confirmLabel: () => LocalizedString;
        /** Restore my vault */
        submit: () => LocalizedString;
        /** Back */
        back: () => LocalizedString;
        /** No vault found on this device. */
        errorNoVault: () => LocalizedString;
        /** This recovery code does not match the vault on this device. */
        errorInvalidCode: () => LocalizedString;
        /** Failed to restore the vault. */
        errorGeneric: () => LocalizedString;
    };
    vault: {
        /** Step {current} · Your vault */
        step: (arg: { current: unknown }) => LocalizedString;
        /** Step {current} of {total} */
        progress: (arg: { current: unknown; total: unknown }) => LocalizedString;
        /** Create your vault */
        title: () => LocalizedString;
        /** Used to secure, back up and restore your sessions. Stays on this phone. */
        subtitle: () => LocalizedString;
        /** Session languages */
        languages: () => LocalizedString;
        /** Other… */
        other: () => LocalizedString;
        /** Email */
        email: () => LocalizedString;
        /** Master password */
        password: () => LocalizedString;
        /** Confirmation */
        confirm: () => LocalizedString;
        /** Strong · add a word to make it very strong */
        strong: () => LocalizedString;
        /** Nobody can reset this password. Without it or your kit, the data is lost. */
        warning: () => LocalizedString;
        /** Create my vault */
        create: () => LocalizedString;
        /** Too weak */
        strength0: () => LocalizedString;
        /** Weak · add a few words */
        strength1: () => LocalizedString;
        /** Medium · add a word to make it strong */
        strength2: () => LocalizedString;
        /** Strong */
        strength3: () => LocalizedString;
        /** Creating the vault… */
        creating: () => LocalizedString;
    };
    kitStep: {
        /** Step {current} · Backup */
        step: (arg: { current: unknown }) => LocalizedString;
        /** Keep your recovery kit */
        title: () => LocalizedString;
        /** The only way back in if you forget your master password. */
        subtitle: () => LocalizedString;
        /** Print */
        print: () => LocalizedString;
        /** Copy */
        copy: () => LocalizedString;
        /** I stored it somewhere safe */
        stored: () => LocalizedString;
        /** Continue */
        continue: () => LocalizedString;
        /** Copied */
        copied: () => LocalizedString;
        /** Save as PDF */
        share: () => LocalizedString;
    };
    models: {
        /** Step {current} · On-device intelligence */
        step: (arg: { current: unknown }) => LocalizedString;
        /** Installing the models */
        title: () => LocalizedString;
        /** Downloaded once. Afterwards everything works offline. */
        subtitle: () => LocalizedString;
        /** Transcription */
        transcription: () => LocalizedString;
        /** Voices and speakers */
        voice: () => LocalizedString;
        /** Mini summary */
        summary: () => LocalizedString;
        /** On Wi-Fi · you can already record */
        wifi: () => LocalizedString;
        /** Enter Tiro */
        enter: () => LocalizedString;
    };
    homeScreen: {
        /** Sessions */
        title: () => LocalizedString;
        /** On the device */
        onDevice: () => LocalizedString;
        /** Start a session */
        start: () => LocalizedString;
        /** Microphone ready · transcribed later, while charging */
        startDetail: () => LocalizedString;
        /** To transcribe */
        toTranscribe: () => LocalizedString;
        /** See all */
        seeAll: () => LocalizedString;
        /** Running · {percent}% */
        running: (arg: { percent: unknown }) => LocalizedString;
        /** {count} waiting */
        waiting: (arg: { count: unknown }) => LocalizedString;
        /** At next charge */
        nextCharge: () => LocalizedString;
        /** Recent */
        recent: () => LocalizedString;
        /** Your sessions will appear here once recorded. */
        empty: () => LocalizedString;
        /** Models are not installed */
        setupTitle: () => LocalizedString;
        /** Transcription is unavailable until then. */
        setupBody: () => LocalizedString;
        /** Install */
        setupAction: () => LocalizedString;
        /** Your first session */
        emptyTitle: () => LocalizedString;
        /** Sessions will appear here. Here is how it goes: */
        emptyBody: () => LocalizedString;
        /** Record */
        emptyRecordTitle: () => LocalizedString;
        /** Place the phone between you, then forget it. */
        emptyRecordBody: () => LocalizedString;
        /** Plug in at night */
        emptyChargeTitle: () => LocalizedString;
        /** Tiro transcribes while charging, then destroys the audio. */
        emptyChargeBody: () => LocalizedString;
        /** Read it back */
        emptyReadTitle: () => LocalizedString;
        /** Transcript, your notes and a mini summary on demand. */
        emptyReadBody: () => LocalizedString;
    };
    preSession: {
        /** Ready to record */
        title: () => LocalizedString;
        /** With whom? */
        who: () => LocalizedString;
        /** Recognise by voice */
        auto: () => LocalizedString;
        /** Choose the subject */
        manual: () => LocalizedString;
        /** Tiro identifies the subject during analysis. You confirm if the voice is new. */
        autoHint: () => LocalizedString;
        /** Change */
        change: () => LocalizedString;
        /** Last time: */
        lastTime: () => LocalizedString;
        /** Do not disturb */
        doNotDisturb: () => LocalizedString;
        /** Silences calls and notifications */
        doNotDisturbDetail: () => LocalizedString;
        /** Start recording */
        start: () => LocalizedString;
        /** Place the phone between you. Encrypted, nothing leaves. */
        footnote: () => LocalizedString;
    };
    recording: {
        /** Encrypted recording */
        badge: () => LocalizedString;
        /** since {time} */
        since: (arg: { time: unknown }) => LocalizedString;
        /** You can turn the phone over. Recording continues with the screen off. */
        hint: () => LocalizedString;
        /** Pause */
        pause: () => LocalizedString;
        /** Resume */
        resume: () => LocalizedString;
        /** Slide to end */
        slide: () => LocalizedString;
    };
    sessionSaved: {
        /** Session saved */
        badge: () => LocalizedString;
        /** Encrypted on this phone. Transcribed at next charge, then the audio is destroyed. */
        body: () => LocalizedString;
        /** Plug in tonight · about {minutes} min of transcription */
        charge: (arg: { minutes: unknown }) => LocalizedString;
        /** Plug in tonight to start the transcription */
        chargeShort: () => LocalizedString;
        /** Back to sessions */
        back: () => LocalizedString;
    };
    queue: {
        /** To transcribe */
        title: () => LocalizedString;
        /** Charging · transcription active */
        charging: () => LocalizedString;
        /** About {minutes} min for {count} sessions */
        remaining: (arg: { count: unknown; minutes: unknown }) => LocalizedString;
        /** Decrypt */
        decrypt: () => LocalizedString;
        /** Voice */
        voice: () => LocalizedString;
        /** Text */
        text: () => LocalizedString;
        /** Speakers */
        speakers: () => LocalizedString;
        /** Resumes where it stopped if the app closes */
        resumes: () => LocalizedString;
        /** Next */
        next: () => LocalizedString;
        /** pending */
        pending: () => LocalizedString;
        /** Interrupted at {percent}% */
        interrupted: (arg: { percent: unknown }) => LocalizedString;
        /** Resume */
        resume: () => LocalizedString;
        /** Encrypted audio is destroyed as soon as transcription ends. No copy remains. */
        destroyed: () => LocalizedString;
    };
    session: {
        /** Session {rank} */
        nth: (arg: { rank: unknown }) => LocalizedString;
        /** {duration} · transcribed on the device · audio destroyed */
        meta: (arg: { duration: unknown }) => LocalizedString;
        /** Mini summary */
        summary: () => LocalizedString;
        /** Written on the device, on demand */
        summaryDetail: () => LocalizedString;
        /** Generate */
        generate: () => LocalizedString;
        /** Subject */
        subject: () => LocalizedString;
        /** You */
        you: () => LocalizedString;
        /** {days} days after the previous one */
        sinceLast: (arg: { days: unknown }) => LocalizedString;
        /** Time */
        time: () => LocalizedString;
        /** Duration */
        duration: () => LocalizedString;
        /** by voice */
        recognised: () => LocalizedString;
        /** Analysis done · audio destroyed */
        analysisDone: () => LocalizedString;
        /** Details */
        details: () => LocalizedString;
        /** Your session notes */
        notes: () => LocalizedString;
        /** Edit */
        edit: () => LocalizedString;
        /** Read the transcript */
        read: () => LocalizedString;
        /** {lines} lines · 2 speakers */
        readDetail: (arg: { lines: unknown }) => LocalizedString;
    };
    analysis: {
        /** Analysis */
        title: () => LocalizedString;
        /** Decryption */
        decrypt: () => LocalizedString;
        /** In memory, never on disk */
        decryptDetail: () => LocalizedString;
        /** Transcription */
        transcription: () => LocalizedString;
        /** Speakers */
        speakers: () => LocalizedString;
        /** You and one other voice */
        speakersDetail: () => LocalizedString;
        /** Audio destroyed */
        destroyed: () => LocalizedString;
        /** No sound of the session remains */
        destroyedDetail: () => LocalizedString;
        /** Subject recognition */
        recognition: () => LocalizedString;
        /** Your confirmation is needed */
        recognitionAsk: () => LocalizedString;
        /** Mini summary */
        summary: () => LocalizedString;
        /** On demand, from the session */
        summaryDetail: () => LocalizedString;
        /** This voice matches no subject */
        unknownTitle: () => LocalizedString;
        /** The closest is {name}, without certainty. Who is it? */
        unknownBody: (arg: { name: unknown }) => LocalizedString;
        /** New subject */
        newSubject: () => LocalizedString;
        /** It is {name} */
        itIs: (arg: { name: unknown }) => LocalizedString;
        /** Other subject… */
        other: () => LocalizedString;
        /** Recognition compares the voice print, never the content. You can correct it later. */
        footnote: () => LocalizedString;
    };
    exportSheet: {
        /** Export the session */
        title: () => LocalizedString;
        /** Format */
        format: () => LocalizedString;
        /** PDF */
        pdf: () => LocalizedString;
        /** Text */
        text: () => LocalizedString;
        /** Content */
        content: () => LocalizedString;
        /** Transcript */
        transcript: () => LocalizedString;
        /** Mini summary */
        summary: () => LocalizedString;
        /** Session notes */
        notes: () => LocalizedString;
        /** Mask proper names */
        maskNames: () => LocalizedString;
        /** Replaced by [NAME] */
        maskNamesDetail: () => LocalizedString;
        /** Share… */
        share: () => LocalizedString;
        /** The file leaves the phone only through the share sheet you choose. */
        footnote: () => LocalizedString;
    };
    subjectList: {
        /** Subjects */
        title: () => LocalizedString;
        /** Recognised by voice · no name stored */
        subtitle: () => LocalizedString;
        /** Search a subject */
        search: () => LocalizedString;
        /** By last session */
        byLast: () => LocalizedString;
        /** Sort */
        sort: () => LocalizedString;
        /** Subjects appear after their first analysed session. */
        empty: () => LocalizedString;
    };
    subjectSheet: {
        /** Recognised by voice · {count} sessions */
        recognised: (arg: { count: unknown }) => LocalizedString;
        /** First session */
        firstSession: () => LocalizedString;
        /** Average rhythm */
        rhythm: () => LocalizedString;
        /** Total time */
        total: () => LocalizedString;
        /** Average length */
        average: () => LocalizedString;
        /** Last session */
        last: () => LocalizedString;
        /** Open the session */
        open: () => LocalizedString;
        /** Your note: {note} */
        yourNote: (arg: { note: unknown }) => LocalizedString;
        /** Previous sessions */
        previous: () => LocalizedString;
    };
    settingsHome: {
        /** Settings */
        title: () => LocalizedString;
        /** Your profile */
        profile: () => LocalizedString;
        /** Security */
        security: () => LocalizedString;
        /** Models and storage */
        storage: () => LocalizedString;
        /** Processing */
        processing: () => LocalizedString;
        /** Recalibrate my voice */
        voice: () => LocalizedString;
        /** About */
        about: () => LocalizedString;
        /** Tiro {version} · free, serverless. Nothing you record leaves this phone. */
        footer: (arg: { version: unknown }) => LocalizedString;
    };
    profilePage: {
        /** Your profile */
        title: () => LocalizedString;
        /** Transcription */
        transcription: () => LocalizedString;
        /** Session languages */
        languages: () => LocalizedString;
        /** Account */
        account: () => LocalizedString;
        /** Email */
        email: () => LocalizedString;
        /** Used to secure and restore your vault. Stays on this phone. */
        footnote: () => LocalizedString;
    };
    securityPage: {
        /** App access */
        access: () => LocalizedString;
        /** Face ID on open */
        faceId: () => LocalizedString;
        /** Auto-lock */
        autoLock: () => LocalizedString;
        /** Encrypted vault */
        vault: () => LocalizedString;
        /** Change master password */
        changePassword: () => LocalizedString;
        /** Recovery kit */
        kit: () => LocalizedString;
        /** Saved */
        kitSaved: () => LocalizedString;
        /** Audio and transcripts are encrypted with AES-256 using a key kept in the phone secure chip. */
        footnote: () => LocalizedString;
    };
    storagePage: {
        /** used by Tiro */
        used: () => LocalizedString;
        /** Models */
        models: () => LocalizedString;
        /** Sessions to transcribe (encrypted audio) */
        pending: () => LocalizedString;
        /** Transcripts */
        transcripts: () => LocalizedString;
        /** Installed models */
        installed: () => LocalizedString;
        /** Transcription language */
        language: () => LocalizedString;
        /** Transcription */
        transcription: () => LocalizedString;
        /** Mini summary */
        summary: () => LocalizedString;
        /** Voices and speakers */
        voice: () => LocalizedString;
    };
    processingPage: {
        /** When to transcribe */
        when: () => LocalizedString;
        /** While charging only */
        charging: () => LocalizedString;
        /** Recommended · no battery impact */
        chargingDetail: () => LocalizedString;
        /** While charging, at night */
        night: () => LocalizedString;
        /** Between 10 pm and 7 am */
        nightDetail: () => LocalizedString;
        /** As soon as possible */
        asap: () => LocalizedString;
        /** May slow down and heat the phone */
        asapDetail: () => LocalizedString;
        /** After transcription */
        after: () => LocalizedString;
        /** Prepare the mini summary */
        prepare: () => LocalizedString;
        /** Otherwise generated on demand */
        prepareDetail: () => LocalizedString;
        /** Notify when ready */
        notify: () => LocalizedString;
        /** Notification without session content */
        notifyDetail: () => LocalizedString;
        /** In every case, encrypted audio is destroyed as soon as transcription ends. */
        footnote: () => LocalizedString;
    };
    languageName: {
        /** French */
        fr: () => LocalizedString;
        /** English */
        en: () => LocalizedString;
        /** German */
        de: () => LocalizedString;
        /** Spanish */
        es: () => LocalizedString;
        /** Italian */
        it: () => LocalizedString;
    };
    voiceStep: {
        /** Step {current} · Your voice */
        step: (arg: { current: unknown }) => LocalizedString;
        /** Read this text aloud */
        title: () => LocalizedString;
        /** Tiro will tell your voice apart from your patients'. */
        subtitle: () => LocalizedString;
        /** The North Wind and the Sun were disputing which was the stronger, when a traveller came along wrapped in a warm cloak. */
        passage: () => LocalizedString;
        /** Your voice print never leaves this phone */
        footnote: () => LocalizedString;
    };
};

export type Formatters = Record<string, never>;