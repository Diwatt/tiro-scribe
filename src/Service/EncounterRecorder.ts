import type { SecureRecorder } from 'secure-recorder';
import { SecureRecorder as SecureRecorderModule } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Encounter } from '@/Entity/Encounter';
import type { Therapist } from '@/Entity/Therapist';
import { EncounterStatus } from '@/Entity/Type';
import { NoActiveRecordingError, NoActiveTherapistException, RecordingFilePathNotAvailableError } from '@/Exception';
import { RecordingPermissionError } from '@/Exception/RecordingPermissionError';
import { EncounterRepository } from '@/Repository/EncounterRepository';
import { TherapistRepository } from '@/Repository/TherapistRepository';

type SecureRecorderFactory = (sessionId: string) => SecureRecorder;

/**
 * EncounterRecorder - Service for managing audio recording sessions.
 *
 * Handles the complete recording lifecycle including:
 * - Permission management
 * - Encounter creation and persistence
 * - SecureRecorder lifecycle (initialize, start, pause, resume, stop)
 * - Encounter status updates
 *
 * All errors use custom exception classes inherited from TiroScribeException.
 */
export class EncounterRecorder {
    private encounter: Encounter | null = null;
    private secureRecorder: SecureRecorder | null = null;
    private therapist: Therapist | null = null;

    public constructor(
        private readonly encounterRepository: EncounterRepository,
        private readonly therapistRepository: TherapistRepository,
        private readonly secureRecorderFactory: SecureRecorderFactory,
        private readonly logger: AppLogger,
    ) {}

    public async start(): Promise<string> {
        this.logger.debug('Starting recording');

        await this.ensurePermission();

        const therapist = await this.getTherapist();

        // Create encounter in memory first (not persisted yet)
        const encounter = Encounter.create(therapist.getUuid());

        const sessionId = encounter.getSessionId();
        const recorder = this.secureRecorderFactory(sessionId);

        await recorder.initialize();
        await recorder.start();

        const filePath = recorder.filePath;
        if (filePath === null) {
            throw new RecordingFilePathNotAvailableError();
        }
        // Add file path to encounter before persisting
        encounter.addEncryptedAudioPath(filePath);

        // Persist encounter once with all initial data
        await this.encounterRepository.persist(encounter);

        this.logger.debug('Recording started and encounter persisted', {
            sessionId,
            encounterUuid: encounter.getUuid(),
            therapistId: therapist.getUuid(),
            filePath,
        });

        this.encounter = encounter;
        this.secureRecorder = recorder;

        return encounter.getUuid();
    }

    public async getFilePath(): Promise<string> {
        const encounter = this.getEncounter();
        const paths = encounter.getEncryptedAudioPaths();

        if (paths.length === 0) {
            throw new NoActiveRecordingError();
        }

        // 1 encounter = 1 file, return the single recording path
        return paths[0];
    }

    public async pause(durationMs: number): Promise<void> {
        this.logger.debug('Pausing recording');

        if (!this.secureRecorder) {
            throw new NoActiveRecordingError();
        }

        // Pause keeps the file open — 1 encounter = 1 file
        await this.secureRecorder.pause();

        await this.encounterRepository.updateStatus(this.getEncounter(), EncounterStatus.Paused, durationMs);
    }

    public async resume(): Promise<string> {
        this.logger.debug('Resuming recording');

        if (!this.secureRecorder) {
            throw new NoActiveRecordingError();
        }

        // Resume continues writing to the same file — 1 encounter = 1 file
        const filePath = await this.secureRecorder.resume();

        this.logger.debug('Recording resumed', {
            filePath,
        });

        await this.encounterRepository.updateStatus(this.getEncounter(), EncounterStatus.Recording);

        return filePath;
    }

    public async stop(durationMs: number): Promise<string> {
        this.logger.debug('Stopping recording');

        if (!this.secureRecorder) {
            throw new NoActiveRecordingError();
        }

        const filePath = await this.secureRecorder.stop();

        const encounter = this.getEncounter();
        await this.encounterRepository.updateStatus(encounter, EncounterStatus.ToProcess, durationMs);
        this.disposeRecorder();

        return filePath;
    }

    public cleanup(): void {
        this.logger.debug('Cleaning up');
        this.disposeRecorder();
        this.encounter = null;
        this.therapist = null;
    }

    private async ensurePermission(): Promise<void> {
        try {
            const hasPermission = await SecureRecorderModule.hasPermission();
            this.logger.debug('Permission check', { hasPermission });

            if (hasPermission) {
                return;
            }

            this.logger.debug('Requesting permission');
            const granted = await SecureRecorderModule.requestPermission();

            if (!granted) {
                throw new RecordingPermissionError();
            }
        } catch (error: unknown) {
            // Re-throw RecordingPermissionError as-is
            if (error instanceof RecordingPermissionError) {
                throw error;
            }

            this.logger.error('Permission check failed', {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.constructor.name : 'unknown',
            });
            throw error;
        }
    }

    private async getTherapist(): Promise<Therapist> {
        if (this.therapist) {
            return this.therapist;
        }

        const therapist = await this.therapistRepository.findCurrent();
        if (!therapist) {
            throw new NoActiveTherapistException();
        }

        this.therapist = therapist;
        return therapist;
    }

    private getEncounter(): Encounter {
        if (!this.encounter) {
            throw new NoActiveRecordingError();
        }
        return this.encounter;
    }

    private disposeRecorder(): void {
        if (this.secureRecorder) {
            this.secureRecorder.dispose();
            this.secureRecorder = null;
        }
    }
}

Container.register(
    EncounterRecorder,
    () =>
        new EncounterRecorder(
            Container.get(EncounterRepository),
            Container.get(TherapistRepository),
            (sessionId: string) => new SecureRecorderModule(sessionId),
            Container.get(AppLogger),
        ),
);
