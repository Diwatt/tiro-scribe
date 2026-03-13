import { observable } from '@legendapp/state';
import { AppConfig } from '@/Core/AppConfig';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Localization } from '@/Localization';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { VoiceCalibrator } from '@/Service';
import type { DownloadTaskExecutor } from '@/Service/InferenceModelDownload/DownloadTaskExecutor';
import { DownloadState } from '@/Service/InferenceModelDownload/Type';
import { InferenceModelDownloader } from '@/Service/InferenceModelDownloader';
import { ActivityStatus, GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { ErrorMessage } from '@/Util/ErrorMessage';
import { AbstractState } from './AbstractState';
import type { PendingTherapistProvider } from './Types';

export class VoiceState extends AbstractState {
    public readonly isSpeakerModelDownloading = observable<boolean>(false);
    public readonly speakerModelProgress = observable<number>(0);
    public readonly isSpeakerModelReady = observable<boolean>(false);

    private modelDownloadExecutor: DownloadTaskExecutor | null = null;
    private pendingTherapistProvider: PendingTherapistProvider | null = null;

    public constructor(
        logger: AppLogger,
        private readonly localization: Localization,
        private readonly inferenceModelDownloader: InferenceModelDownloader,
        private readonly globalActivityStatus: GlobalActivityStatus,
        private readonly masterKeyVault: MasterKeyVault,
        private readonly appConfig: AppConfig,
        private readonly voiceCalibrator: VoiceCalibrator,
    ) {
        super(logger);
    }

    /**
     * Called by the parent state to provide access to the pending therapist.
     * The state does **not** own the value, merely holds a reference to the provider.
     */
    public setPendingTherapistProvider(provider: PendingTherapistProvider): void {
        this.pendingTherapistProvider = provider;
    }

    public async calibrateVoice(): Promise<void> {
        this.logger.debug('[VoiceState] calibrateVoice', {
            hasPendingTherapist: this.pendingTherapistProvider?.getPendingTherapist() != null,
        });

        if (this.isSpeakerModelDownloading.get()) {
            return;
        }

        this.error.set(undefined);
        try {
            await this.runAsyncAction(async () => {
                const therapist = this.pendingTherapistProvider?.getPendingTherapist();
                if (!therapist) {
                    throw new Error('Pending therapist missing during calibration');
                }

                this.logger.debug('[VoiceState] masterKeyVault load', {
                    therapistUuid: therapist.uuid,
                });
                const masterKey = await this.masterKeyVault.load(therapist.uuid);

                this.logger.debug('[VoiceState] run', { therapistUuid: therapist.uuid });
                // pass the master key directly; the calibrator will build a matrix
                // sized to the extracted speaker vector.  this avoids dimension
                // mismatches when the model output size changes.
                const biocode = await this.voiceCalibrator.run(masterKey, this.appConfig.voiceCalibrationDurationMs);

                therapist.biocode = biocode.projectedVector;
            });
        } catch (error: unknown) {
            const ll = this.localization.getLL();
            this.logger.debug('[VoiceState] calibrateVoice failed', {
                message: ErrorMessage.toString(error),
                stack: error instanceof Error ? error.stack : undefined,
                durationMs: this.appConfig.voiceCalibrationDurationMs,
                therapistUuid: this.pendingTherapistProvider?.getPendingTherapist()?.uuid,
            });
            this.error.set(ll.onboarding.errorVoiceCalibration());
        }
    }

    public async ensureSpeakerModel(): Promise<void> {
        if (this.isSpeakerModelReady.get()) {
            return;
        }

        const ll = this.localization.getLL();
        const downloader = this.inferenceModelDownloader;

        const existing = downloader.getLocalPath('speaker_id');
        if (existing) {
            this.isSpeakerModelReady.set(true);
            return;
        }

        try {
            this.isSpeakerModelDownloading.set(true);
            this.globalActivityStatus.setStatus(ActivityStatus.Pending, ll.download.speakerModel());

            const executor = await downloader.download('speaker_id');
            this.modelDownloadExecutor = executor;

            executor.progress$.onChange(({ value: progress }) => {
                this.speakerModelProgress.set(progress);
                const percentage = Math.round(progress);
                const message = `${ll.download.speakerModel()} ${percentage}%`;
                this.globalActivityStatus.setStatus(ActivityStatus.Pending, message);
            });

            const handleStateChange = ({ value: state }: { value: DownloadState }) => {
                if (state === DownloadState.Completed) {
                    this.markSpeakerModelReady(ll);
                } else if (state === DownloadState.Failed || state === DownloadState.Cancelled) {
                    this.markSpeakerModelFailed(ll, executor.getError());
                }
            };

            executor.state$.onChange(handleStateChange);

            const initialState = executor.getState();
            if (initialState === DownloadState.Completed) {
                this.markSpeakerModelReady(ll);
            } else if (initialState === DownloadState.Failed || initialState === DownloadState.Cancelled) {
                this.markSpeakerModelFailed(ll, executor.getError());
            }

            await new Promise<void>((resolve, reject) => {
                executor.state$.onChange(({ value: state }) => {
                    if (state === DownloadState.Completed) {
                        resolve();
                    }
                    if (state === DownloadState.Failed || state === DownloadState.Cancelled) {
                        reject(executor.getError());
                    }
                });
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.logger.error('Speaker model download failed', {
                error: errorMsg,
                errorDetails: err instanceof Error ? err.stack : undefined,
            });
            this.globalActivityStatus.setStatus(ActivityStatus.Error, ll.download.speakerModelError());
            this.isSpeakerModelDownloading.set(false);
            throw err;
        }
    }

    public reset(): void {
        super.reset();

        if (
            this.modelDownloadExecutor &&
            typeof this.modelDownloadExecutor.isDownloading === 'function' &&
            this.modelDownloadExecutor.isDownloading()
        ) {
            if (typeof this.modelDownloadExecutor.cancel === 'function') {
                this.modelDownloadExecutor.cancel();
            }
        }

        this.isSpeakerModelDownloading.set(false);
        this.speakerModelProgress.set(0);
        this.isSpeakerModelReady.set(false);
        this.modelDownloadExecutor = null;
    }

    private markSpeakerModelReady(ll: ReturnType<Localization['getLL']>): void {
        this.isSpeakerModelReady.set(true);
        this.isSpeakerModelDownloading.set(false);
        this.globalActivityStatus.setStatus(ActivityStatus.Success, ll.download.speakerModelSuccess(), undefined, 3000);
    }

    private markSpeakerModelFailed(ll: ReturnType<Localization['getLL']>, error?: unknown): void {
        this.logger.error('Speaker model download failed', { error });
        this.globalActivityStatus.setStatus(ActivityStatus.Error, ll.download.speakerModelError());
        this.isSpeakerModelDownloading.set(false);
    }
}

// register voice state with container so only one instance is created
Container.register(VoiceState, () => {
    const logger = Container.get(AppLogger);
    const localization = Container.get(Localization);
    const downloader = Container.get(InferenceModelDownloader);
    const globalActivityStatus = Container.get(GlobalActivityStatus);
    const masterKeyVault = Container.get(MasterKeyVault);
    const appConfig = Container.get(AppConfig);
    const voiceCalibrator = Container.get(VoiceCalibrator);

    return new VoiceState(
        logger,
        localization,
        downloader,
        globalActivityStatus,
        masterKeyVault,
        appConfig,
        voiceCalibrator,
    );
});
