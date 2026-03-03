// src/Container.ts

import { Kysely } from 'kysely';
import { ExpoDialect } from 'kysely-expo';
import { consoleTransport, logger as reactNativeLogger } from 'react-native-logs';
import { ApiClientRegistry } from './Api/ApiClientRegistry';
import { AppConfig } from './Config/AppConfig';
import { Registry } from './Database/Registry';
import type { DatabaseSchema } from './Database/Type';
import { AppLanguage } from './Localization/AppLanguage';
import { DownloadQueueRepository } from './Repository/DownloadQueueRepository';
import { DEFAULT_MATRIX, DeviceCompatibilityGate } from './Security/DeviceCompatibilityGate';
import { MasterKeyVault } from './Security/MasterKeyVault';
import { RecoveryKit } from './Security/RecoveryKit';
import { AudioRecording } from './Service/AudioRecording';
import { InferenceManager } from './Service/InferenceManager';
import { InferenceModelConfigProvider } from './Service/InferenceModelConfigProvider';
import { ChecksumVerifier } from './Service/InferenceModelDownload/ChecksumVerifier';
import { DownloadTaskManager } from './Service/InferenceModelDownload/DownloadTaskManager';
import { ModelArtifactStorage } from './Service/InferenceModelDownload/ModelArtifactStorage';
import { InferenceModelDownloader } from './Service/InferenceModelDownloader';
import { InferenceModelVersionManager } from './Service/InferenceModelVersionManager';
import { InMemoryAudioRecorder } from './Service/InMemoryAudioRecorder';
import { BiocodeFactory } from './Service/SpeakerId/BiocodeFactory';
import { SpeakerEmbedder } from './Service/SpeakerId/SpeakerEmbedder';
import { VoiceCalibrator } from './Service/SpeakerId/VoiceCalibrator';
import { GlobalActivityStatus } from './State/GlobalActivityStatus';
import { FormValidator } from './State/Onboarding/FormValidator';
import { OnboardingState } from './State/Onboarding/State';
import { StartupOrchestrator } from './State/StartupOrchestrator';

/**
 * Logger instance type from react-native-logs
 */
type ReactNativeLogger = ReturnType<typeof reactNativeLogger.createLogger>;

/**
 * Container — Composition root for all singleton instances.
 *
 * Access services via `Container.logger`, `Container.recoveryKit`, etc.
 * Primitive constants (MAX_LENGTH, PASSWORD_MIN_LENGTH) stay in their domain files.
 */
export class Container {
    // Infrastructure Services
    public static readonly apiClientRegistry: ApiClientRegistry = new ApiClientRegistry();
    public static readonly appConfig: AppConfig = new AppConfig();
    public static readonly appLanguage: AppLanguage = new AppLanguage();
    public static readonly audioRecording: AudioRecording = new AudioRecording();
    public static readonly biocodeFactory: BiocodeFactory = new BiocodeFactory();
    public static readonly logger: ReactNativeLogger = reactNativeLogger.createLogger({
        severity: Container.appConfig.isDev ? 'debug' : 'error',
        transport: consoleTransport,
        transportOptions: {
            colors: {
                info: 'blueBright',
                warn: 'yellowBright',
                error: 'redBright',
                debug: 'whiteBright',
            } as const,
        },
        dateFormat: 'time',
        printLevel: true,
        printDate: true,
    });

    public static readonly deviceCompatibilityGate: DeviceCompatibilityGate = new DeviceCompatibilityGate(
        Container.logger,
        DEFAULT_MATRIX,
    );
    public static readonly formValidator: FormValidator = new FormValidator();
    public static readonly globalActivityStatus: GlobalActivityStatus = new GlobalActivityStatus();
    public static readonly inferenceManager: InferenceManager = new InferenceManager(Container.logger);
    public static readonly inferenceModelConfigProvider: InferenceModelConfigProvider =
        new InferenceModelConfigProvider();
    public static readonly inferenceModelDownloader: InferenceModelDownloader = new InferenceModelDownloader(
        Container.logger,
        new ModelArtifactStorage(Container.logger),
        new DownloadTaskManager(
            Container.logger,
            new DownloadQueueRepository(),
            new ChecksumVerifier(),
            new ModelArtifactStorage(Container.logger),
        ),
        Container.inferenceModelConfigProvider,
    );
    public static readonly inferenceModelVersionManager: InferenceModelVersionManager =
        InferenceModelVersionManager.createDefaultInstance();
    public static readonly inMemoryAudioRecorder: InMemoryAudioRecorder = new InMemoryAudioRecorder(Container.logger);
    public static readonly masterKeyVault: MasterKeyVault = new MasterKeyVault();
    public static readonly onboardingState: OnboardingState = new OnboardingState(new RecoveryKit());
    public static readonly queryBuilder = new Kysely<DatabaseSchema>({
        dialect: new ExpoDialect({
            database: Container.appConfig.databaseName,
        }),
    });
    public static readonly registry: Registry = new Registry();
    public static readonly speakerEmbedder: SpeakerEmbedder = new SpeakerEmbedder();
    public static readonly startupOrchestrator: StartupOrchestrator = new StartupOrchestrator();
    public static readonly voiceCalibrator: VoiceCalibrator = new VoiceCalibrator(
        Container.speakerEmbedder,
        Container.biocodeFactory,
        Container.logger,
    );
}

export type LoggerInterface = typeof Container.logger;
