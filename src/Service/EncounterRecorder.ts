import type { SecureRecorder } from 'secure-recorder';
import { SecureRecorder as SecureRecorderModule } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Repository } from '@/Database/Repository';
import type { EntityClass } from '@/Database/Type';
import { Encounter } from '@/Entity/Encounter';
import { EncounterStatus } from '@/Entity/Type';
import { TherapistRepository } from '@/Repository/TherapistRepository';

type SecureRecorderFactory = (sessionId: string) => SecureRecorder;

export class EncounterRecorder {
    private static readonly SESSION_PREFIX = 'encounter';

    private encounterUuid: string | null = null;
    private secureRecorder: SecureRecorder | null = null;

    public constructor(
        private readonly repository: Repository<Encounter>,
        private readonly therapistRepository: TherapistRepository,
        private readonly secureRecorderFactory: SecureRecorderFactory,
        private readonly logger: AppLogger,
    ) {}

    public async startRecording(): Promise<string> {
        this.logger.debug('▶️ [EncounterRecorder] startRecording — step 1: check permission');

        const hasPermission = await this.ensureRecordingPermission();
        if (!hasPermission) {
            throw new Error('Microphone permission denied');
        }

        this.logger.debug('▶️ [EncounterRecorder] — step 2: query therapist');
        const therapist = await this.therapistRepository.findCurrent();
        if (therapist === undefined) {
            throw new Error('No therapist found in database');
        }

        this.logger.debug('▶️ [EncounterRecorder] — step 3: create encounter');
        const encounter = Encounter.createForRecording(therapist.getUuid());

        this.logger.debug('▶️ [EncounterRecorder] — step 4: persist encounter');
        await this.persistEncounter(encounter);

        const encounterUuid = encounter.getUuid();
        this.logger.debug('📝 [EncounterRecorder] Encounter created', {
            encounterUuid,
            therapistId: therapist.getUuid(),
        });

        this.logger.debug('▶️ [EncounterRecorder] — step 5: create SecureRecorder');
        const sessionId = `${EncounterRecorder.SESSION_PREFIX}-${encounterUuid}`;
        const recorder = this.secureRecorderFactory(sessionId);

        this.logger.debug('▶️ [EncounterRecorder] — step 6: initialize SecureRecorder');
        await recorder.initialize();

        this.logger.debug('▶️ [EncounterRecorder] — step 7: start SecureRecorder');
        await recorder.start();

        this.logger.debug('🎙️ [EncounterRecorder] Recording started', {
            sessionId,
            filePath: recorder.filePath,
        });

        this.encounterUuid = encounterUuid;
        this.secureRecorder = recorder;

        return encounterUuid;
    }

    public async getFilePath(): Promise<string> {
        if (!this.secureRecorder) {
            throw new Error('No active recorder');
        }
        const filePath = this.secureRecorder.filePath;
        if (!filePath) {
            throw new Error('No file path available');
        }
        return filePath;
    }

    public async pauseRecording(durationMs: number): Promise<void> {
        this.logger.debug('⏸️ [EncounterRecorder] pauseRecording called');

        if (!this.secureRecorder) {
            throw new Error('No active recorder');
        }

        const filePath = await this.secureRecorder.stop();
        this.logger.debug('⏸️ [EncounterRecorder] Recorder stopped', { filePath });

        await this.updateEncounterStatus(EncounterStatus.Paused, durationMs);
    }

    public async resumeRecording(): Promise<string> {
        this.logger.debug('▶️ [EncounterRecorder] resumeRecording called');

        if (!this.encounterUuid) {
            throw new Error('No active encounter');
        }

        const sessionId = `${EncounterRecorder.SESSION_PREFIX}-${this.encounterUuid}-${Date.now()}`;
        const recorder = this.secureRecorderFactory(sessionId);

        await recorder.initialize();
        await recorder.start();

        this.logger.debug('🎙️ [EncounterRecorder] Recording resumed', {
            sessionId,
            filePath: recorder.filePath,
        });

        this.secureRecorder = recorder;
        await this.updateEncounterStatus(EncounterStatus.Recording, undefined);

        const filePath = recorder.filePath;
        if (!filePath) {
            throw new Error('No file path available after starting recorder');
        }
        return filePath;
    }

    public async stopRecording(durationMs: number): Promise<string> {
        this.logger.debug('⏹️ [EncounterRecorder] stopRecording called');

        if (!this.secureRecorder) {
            throw new Error('No active recorder');
        }

        const filePath = await this.secureRecorder.stop();
        this.logger.debug('⏹️ [EncounterRecorder] Recorder stopped', { filePath });

        await this.updateEncounterWithRecording(filePath, durationMs);
        this.disposeRecorder();

        return filePath;
    }

    public cleanup(): void {
        this.logger.debug('🔴 [EncounterRecorder] cleanup called');
        this.disposeRecorder();
        this.encounterUuid = null;
    }

    private async ensureRecordingPermission(): Promise<boolean> {
        try {
            const hasPermission = await SecureRecorderModule.hasPermission();
            this.logger.debug('▶️ [EncounterRecorder] permission check result', { hasPermission });

            if (hasPermission) {
                return true;
            }

            this.logger.debug('▶️ [EncounterRecorder] requesting permission');
            const granted = await SecureRecorderModule.requestPermission();
            return granted;
        } catch (error: unknown) {
            this.logger.error('❌ [EncounterRecorder] permission check threw', {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.constructor.name : 'unknown',
            });
            throw error;
        }
    }

    private async persistEncounter(encounter: Encounter): Promise<void> {
        try {
            await this.repository.persist(encounter);
        } catch (error: unknown) {
            this.logger.error('❌ [EncounterRecorder] persist encounter threw', {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.constructor.name : 'unknown',
            });
            throw error;
        }
    }

    private async updateEncounterStatus(status: EncounterStatus, durationMs?: number): Promise<void> {
        const encounterUuid = this.getEncounterUuid();
        const encounter = await this.repository.find(encounterUuid);

        if (encounter) {
            encounter.setStatus(status);
            if (durationMs !== undefined) {
                encounter.setTotalDuration(durationMs);
            }
            encounter.setUpdatedAt(dayjs.utc());
            await this.repository.persist(encounter);

            this.logger.debug('📝 [EncounterRecorder] Encounter status updated', {
                encounterUuid,
                status,
                durationMs,
            });
        }
    }

    private async updateEncounterWithRecording(filePath: string, durationMs: number): Promise<void> {
        const encounterUuid = this.getEncounterUuid();
        const encounter = await this.repository.find(encounterUuid);

        if (encounter) {
            encounter.setStatus(EncounterStatus.ToProcess);
            encounter.setTotalDuration(durationMs);
            encounter.setUpdatedAt(dayjs.utc());
            encounter.addEncryptedAudioPathWithDuration(filePath, durationMs);
            await this.repository.persist(encounter);

            this.logger.debug('📝 [EncounterRecorder] Encounter updated with recording', {
                encounterUuid,
                status: EncounterStatus.ToProcess,
                totalDuration: durationMs,
                encryptedAudioPath: filePath,
            });
        }
    }

    private getEncounterUuid(): string {
        if (!this.encounterUuid) {
            throw new Error('No active encounter');
        }
        return this.encounterUuid;
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
            Repository.create<Encounter>(Encounter.entityName, Encounter as EntityClass<Encounter>),
            Container.get(TherapistRepository),
            (sessionId: string) => new SecureRecorderModule(sessionId),
            Container.get(AppLogger),
        ),
);
