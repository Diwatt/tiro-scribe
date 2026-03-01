import type { Translation } from '../i18n-types';

const fr: Translation = {
    onboarding: {
        step: 'Étape {current} sur {total}',
        aboutYou: 'À propos de vous',
        aboutYouDesc: "Pour adapter l'app à votre pratique.",
        languages: 'Langues',
        qualifications: 'Qualifications',
        qualificationsPlaceholder: 'Rechercher des qualifications…',
        experience: 'Expérience (années)',
        methods: 'Méthodes thérapeutiques',
        methodsPlaceholder: 'Rechercher des méthodes…',
        continue: 'Continuer',
        secureAccount: 'Compte sécurisé',
        secureAccountDesc: 'Vos données sont chiffrées avec ce mot de passe. Nous ne le voyons jamais.',
        email: 'E-mail',
        password: 'Mot de passe',
        confirmPassword: 'Confirmer le mot de passe',
        back: 'Retour',
        creatingAccount: 'Création du compte…',
        accountReady: 'Compte prêt',
        recoveryDesc:
            "Conservez ce code de récupération en lieu sûr. C'est le seul moyen de récupérer votre compte si vous perdez votre mot de passe.",
        saveRecoveryKit: 'Sauvegarder mon Kit de Secours',
        recoveryKitPending: 'Génération en cours…',
        copyCode: 'Copier le code',
        codeCopied: 'Code copié',
        savedCodeChecked: "J'ai sauvegardé ce code",
        finish: 'Terminer',
        voiceCalibration: 'Calibration vocale',
        voiceCalibrationDesc:
            "Lisez ce texte pour calibrer votre profil sécurisé. Nous enregistrerons environ 5 secondes, puis utiliserons l'embedding vocal sur l'appareil pour créer votre profil. L'enregistrement est supprimé immédiatement.",
        startCalibration: 'Démarrer la calibration',
        errorConfirmSaveCode: 'Veuillez confirmer que vous avez sauvegardé votre code de récupération.',
        errorSessionLost: 'Session perdue. Veuillez recommencer.',
        errorAccountCreation: 'Échec de la création du compte.',
        errorVoiceCalibration: 'Échec de la calibration vocale.',
        errorSaveAccount: "Échec de l'enregistrement du compte.",
        errorNoRecoveryCode: 'Aucun code de récupération disponible.',
    },
    recoveryKit: {
        generatingPdf: 'Génération du PDF…',
        saved: 'Kit de secours enregistré',
        savedMessage: 'Votre kit a été généré et partagé.',
        errorGeneric: 'Échec de la génération ou du partage du kit de secours.',
    },
    error: {
        title: 'Erreur',
    },
    device: {
        notSupported: 'Appareil non pris en charge',
        notSupportedMessage: "Tiro Scribe nécessite un appareil compatible pour l'inférence sur l'appareil.",
        notSupportedHint: 'iOS : 12.0+, 3,5 Go+ RAM, 64 bits.\nAndroid : 9.0+, 3,5 Go+ RAM, processeur 64 bits.',
    },
    settings: {
        profile: 'Profil',
        therapistProfile: 'Profil thérapeute',
        therapistProfileDesc: 'Gérer vos informations de profil',
        privacySecurity: 'Confidentialité et sécurité',
        privacySettings: 'Paramètres de confidentialité',
        privacySettingsDesc: 'Configurer la protection des données',
        preferences: 'Préférences',
        notifications: 'Notifications',
        notificationsDesc: 'Activer les notifications push',
        darkMode: 'Mode sombre',
        darkModeDesc: 'Utiliser le thème sombre',
        about: 'À propos',
        version: 'Version',
    },
    home: {
        initializingAi: "Initialisation du moteur d'inférence…",
        processingDelayed: "Le traitement sera retardé jusqu'à ce que les artefacts soient prêts.",
    },
    transcript: {
        title: 'Transcription',
    },
    subjects: {
        searchPlaceholder: 'Rechercher des sujets...',
        lastEncounter: 'Dernière rencontre :',
    },
    recordButton: {
        record: 'Enregistrer',
        stop: 'Arrêter',
    },
    activity: {
        loading: 'Chargement…',
        starting: 'Démarrage…',
        done: 'Terminé',
        warning: 'Attention',
        error: 'Une erreur est survenue',
    },
    status: {
        readyTitle: 'Prêt',
        readySubtitle: 'Aucune tâche en attente.',
    },
    download: {
        speakerModel: "Téléchargement du modèle d'identification du locuteur…",
        speakerModelProgress: "Téléchargement du modèle d'identification du locuteur… {percentage}%",
        speakerModelSuccess: 'Modèle de locuteur téléchargé avec succès',
        speakerModelError: 'Échec du téléchargement du modèle de locuteur',
    },
    ui: {
        language: "Langue de l'interface",
        practiceLanguages: 'Langues de pratique',
    },
};

export { fr };
