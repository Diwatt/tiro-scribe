import { observable } from '@legendapp/state';
import { Container } from '@/Core/Container';
import { AppLogger } from '@/Core/AppLogger';
import { TherapistRepository } from '@/Repository/TherapistRepository';
import type { CreateTherapistInput } from '@/Security/TherapistForge';
import { AudioSegment } from './Data/AudioSegment';
import type { DevAudioIngest } from './Data/DevAudioIngest';
import type { DevEncounterSeed } from './Data/DevEncounterSeed';
import { DevAudioScanner } from './DevAudioScanner';
import { DevEncounterSeeder } from './DevEncounterSeeder';
import { DevEncryptionException } from './DevEncryptionException';
import { DevFileEncryptor } from './DevFileEncryptor';
import { DevSeedException } from './DevSeedException';
import { DevTherapistOnboarding } from './DevTherapistOnboarding';

export interface DevAudioFileEntry {
    name: string;
    path: string;
    sizeBytes: number;
    encryptedPath: string | null;
    isEncrypted: boolean;
    durationMs: number | null;
}

export interface DevAudioNotification {
    message: string;
    type: 'success' | 'error';
}

interface DevAudioStateSnapshot {
    sourceDirectory: string;
    files: DevAudioFileEntry[];
    isLoading: boolean;
    lastResult: DevAudioIngest | null;
    lastError: string | null;
    lastSeed: DevEncounterSeed | null;
    lastTherapistUuid: string | null;
    notification: DevAudioNotification | null;
}

const INITIAL_STATE: DevAudioStateSnapshot = {
    sourceDirectory: '',
    files: [],
    isLoading: false,
    lastResult: null,
    lastError: null,
    lastSeed: null,
    lastTherapistUuid: null,
    notification: null,
};

export class DevAudioState {
    private static readonly DEV_THERAPIST_INPUT: CreateTherapistInput = {
        email: 'dev@tiro-scribe.local',
        password: 'dev-password-123',
        languages: ['fr'],
        qualifications: ['Psychiatrist'],
        experience: '5',
        methods: ['CBT'],
    };

    public readonly state$ = observable(INITIAL_STATE);

    public constructor(
        private readonly scanner: DevAudioScanner,
        private readonly encryptor: DevFileEncryptor,
        private readonly seeder: DevEncounterSeeder,
        private readonly therapistRepository: TherapistRepository,
        private readonly devTherapistOnboarding: DevTherapistOnboarding,
        private readonly logger: AppLogger,
    ) {}

    public get sourceDirectory(): string {
        return this.state$.sourceDirectory.get();
    }

    public get files(): DevAudioFileEntry[] {
        return this.state$.files.get();
    }

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public get lastResult(): DevAudioIngest | null {
        return this.state$.lastResult.get();
    }

    public get lastSeed(): DevEncounterSeed | null {
        return this.state$.lastSeed.get();
    }

    public get lastTherapistUuid(): string | null {
        return this.state$.lastTherapistUuid.get();
    }

    public get lastError(): string | null {
        return this.state$.lastError.get();
    }

    public get notification(): DevAudioNotification | null {
        return this.state$.notification.get();
    }

    public setSourceDirectory(directory: string): void {
        this.state$.sourceDirectory.set(directory);
        this.state$.lastError.set(null);
    }

    public async scanDirectory(directory: string): Promise<void> {
        this.state$.sourceDirectory.set(directory);
        this.state$.lastError.set(null);
        this.state$.notification.set(null);

        if (directory.length === 0) {
            this.state$.files.set([]);
            return;
        }

        this.state$.isLoading.set(true);

        try {
            const entries = await this.scanner.scan(directory);
            this.state$.files.set(entries);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.lastError.set(`Scan failed: ${message}`);
            this.state$.notification.set({ message: `Scan failed: ${message}`, type: 'error' });
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public async encryptFile(filePath: string): Promise<void> {
        this.state$.isLoading.set(true);
        this.state$.lastError.set(null);
        this.state$.lastResult.set(null);
        this.state$.notification.set(null);

        try {
            const result = await this.encryptor.encrypt(filePath);
            this.state$.lastResult.set(result);
            this.state$.notification.set({ message: result.summary, type: 'success' });
            this.updateFileEntry(filePath, result);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.lastError.set(message);
            this.state$.notification.set({ message, type: 'error' });

            if (error instanceof DevEncryptionException) {
                throw error;
            }
            throw new DevEncryptionException(message, 'UNKNOWN_ERROR');
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public async encryptAll(): Promise<void> {
        const paths = this.state$.files.get()
            .filter((file) => !file.isEncrypted)
            .map((file) => file.path);

        this.state$.isLoading.set(true);
        this.state$.lastError.set(null);
        this.state$.notification.set(null);

        try {
            const results = await this.encryptor.encryptAll(paths);

            if (results.length > 0) {
                const lastResult = results[results.length - 1];
                this.state$.lastResult.set(lastResult);
                this.state$.notification.set({
                    message: `${results.length} file(s) encrypted`,
                    type: 'success',
                });
            }

            for (const result of results) {
                const filePath = result.inputFile.path;
                this.updateFileEntry(filePath, result);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.lastError.set(message);
            this.state$.notification.set({ message, type: 'error' });

            if (error instanceof DevEncryptionException) {
                throw error;
            }
            throw new DevEncryptionException(message, 'UNKNOWN_ERROR');
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public async seedEncounter(encryptedPath: string, durationMs: number): Promise<void> {
        this.state$.isLoading.set(true);
        this.state$.lastError.set(null);
        this.state$.notification.set(null);

        try {
            const therapist = await this.therapistRepository.findCurrent();
            if (!therapist) {
                throw new DevSeedException(
                    'No persisted therapist. Run the dev therapist onboarding first.',
                    'THERAPIST_NOT_FOUND',
                );
            }

            const seed = await this.seeder.seed(therapist.getUuid(), encryptedPath, durationMs);
            this.state$.lastSeed.set(seed);
            this.state$.notification.set({ message: `Seeded: ${seed.summary}`, type: 'success' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.lastError.set(message);
            this.state$.notification.set({ message, type: 'error' });
            this.logger.error('DevAudioState: seed failed', {
                message,
                stack: error instanceof Error ? error.stack : undefined,
            });

            if (error instanceof DevSeedException) {
                throw error;
            }
            throw new DevSeedException(message, 'SEED_FAILED', error instanceof Error ? error : undefined);
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public async createTherapistFromAudio(sourceAudioPath: string, startMs: number, endMs: number): Promise<void> {
        this.state$.isLoading.set(true);
        this.state$.lastError.set(null);
        this.state$.notification.set(null);

        try {
            if (sourceAudioPath.length === 0) {
                throw new DevSeedException('Source audio path is required to create the dev therapist', 'SOURCE_AUDIO_REQUIRED');
            }
            if (!Number.isInteger(startMs) || !Number.isInteger(endMs) || startMs < 0 || endMs <= startMs) {
                throw new DevSeedException(
                    `Invalid segment: start=${startMs}ms, end=${endMs}ms`,
                    'INVALID_SEGMENT',
                );
            }

            const therapist = await this.devTherapistOnboarding.createFromAudio(
                sourceAudioPath,
                new AudioSegment(startMs, endMs),
                DevAudioState.DEV_THERAPIST_INPUT,
            );

            this.state$.lastTherapistUuid.set(therapist.getUuid());
            this.state$.notification.set({ message: `Therapist created: ${therapist.getUuid()}`, type: 'success' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.lastError.set(message);
            this.state$.notification.set({ message, type: 'error' });
            this.logger.error('DevAudioState: therapist onboarding failed', {
                message,
                stack: error instanceof Error ? error.stack : undefined,
            });

            if (error instanceof DevSeedException) {
                throw error;
            }
            throw new DevSeedException(
                message,
                'THERAPIST_ONBOARDING_FAILED',
                error instanceof Error ? error : undefined,
            );
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public dismissNotification(): void {
        this.state$.notification.set(null);
    }

    public clearError(): void {
        this.state$.lastError.set(null);
    }

    public reset(): void {
        this.state$.set({ ...INITIAL_STATE });
    }

    private updateFileEntry(filePath: string, result: DevAudioIngest): void {
        const currentFiles = this.state$.files.get();
        const updatedFiles = currentFiles.map((file) =>
            file.path === filePath
                ? { ...file, encryptedPath: result.outputFile.path, isEncrypted: true, durationMs: result.durationMs }
                : file,
        );
        this.state$.files.set(updatedFiles);
    }
}

Container.register(
    DevAudioState,
    () =>
        new DevAudioState(
            Container.get(DevAudioScanner),
            Container.get(DevFileEncryptor),
            Container.get(DevEncounterSeeder),
            Container.get(TherapistRepository),
            Container.get(DevTherapistOnboarding),
            Container.get(AppLogger),
        ),
);
