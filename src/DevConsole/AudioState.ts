import { observable } from '@legendapp/state';
import { Container } from '@/Core/Container';
import { AppLogger } from '@/Core/AppLogger';
import { TherapistRepository } from '@/Repository/TherapistRepository';
import type { CreateTherapistInput } from '@/Security/TherapistForge';
import { AudioSegment } from './Data/AudioSegment';
import type { AudioIngest } from './Data/AudioIngest';
import type { EncounterFixture } from './Data/EncounterFixture';
import { AudioScanner } from './AudioScanner';
import { FixtureLoader } from './FixtureLoader';
import { SourceIngestException } from './SourceIngestException';
import { AudioFileEncryptor } from './AudioFileEncryptor';
import { FixtureException } from './FixtureException';
import { TherapistOnboarding } from './TherapistOnboarding';

export interface AudioFileEntry {
    name: string;
    path: string;
    sizeBytes: number;
    encryptedPath: string | null;
    isEncrypted: boolean;
    durationMs: number | null;
}

export interface AudioNotification {
    message: string;
    type: 'success' | 'error';
}

interface AudioStateSnapshot {
    sourceDirectory: string;
    files: AudioFileEntry[];
    isLoading: boolean;
    lastResult: AudioIngest | null;
    lastError: string | null;
    lastFixture: EncounterFixture | null;
    lastTherapistUuid: string | null;
    notification: AudioNotification | null;
}

const INITIAL_STATE: AudioStateSnapshot = {
    sourceDirectory: '',
    files: [],
    isLoading: false,
    lastResult: null,
    lastError: null,
    lastFixture: null,
    lastTherapistUuid: null,
    notification: null,
};

export class AudioState {
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
        private readonly scanner: AudioScanner,
        private readonly encryptor: AudioFileEncryptor,
        private readonly fixtureLoader: FixtureLoader,
        private readonly therapistRepository: TherapistRepository,
        private readonly therapistOnboarding: TherapistOnboarding,
        private readonly logger: AppLogger,
    ) {}

    public get sourceDirectory(): string {
        return this.state$.sourceDirectory.get();
    }

    public get files(): AudioFileEntry[] {
        return this.state$.files.get();
    }

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public get lastResult(): AudioIngest | null {
        return this.state$.lastResult.get();
    }

    public get lastFixture(): EncounterFixture | null {
        return this.state$.lastFixture.get();
    }

    public get lastTherapistUuid(): string | null {
        return this.state$.lastTherapistUuid.get();
    }

    public get lastError(): string | null {
        return this.state$.lastError.get();
    }

    public get notification(): AudioNotification | null {
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

            if (error instanceof SourceIngestException) {
                throw error;
            }
            throw new SourceIngestException(message, 'UNKNOWN_ERROR');
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

            if (error instanceof SourceIngestException) {
                throw error;
            }
            throw new SourceIngestException(message, 'UNKNOWN_ERROR');
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public async loadEncounterFixture(encryptedPath: string, durationMs: number): Promise<void> {
        this.state$.isLoading.set(true);
        this.state$.lastError.set(null);
        this.state$.notification.set(null);

        try {
            const therapist = await this.therapistRepository.findCurrent();
            if (!therapist) {
                throw new FixtureException(
                    'No persisted therapist. Run the dev therapist onboarding first.',
                    'THERAPIST_NOT_FOUND',
                );
            }

            const fixture = await this.fixtureLoader.load(therapist.getUuid(), encryptedPath, durationMs);
            this.state$.lastFixture.set(fixture);
            this.state$.notification.set({ message: `Fixture loaded: ${fixture.summary}`, type: 'success' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.lastError.set(message);
            this.state$.notification.set({ message, type: 'error' });
            this.logger.error('AudioState: fixture load failed', {
                message,
                stack: error instanceof Error ? error.stack : undefined,
            });

            if (error instanceof FixtureException) {
                throw error;
            }
            throw new FixtureException(message, 'FIXTURE_FAILED', error instanceof Error ? error : undefined);
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
                throw new FixtureException('Source audio path is required to create the dev therapist', 'SOURCE_AUDIO_REQUIRED');
            }
            if (!Number.isInteger(startMs) || !Number.isInteger(endMs) || startMs < 0 || endMs <= startMs) {
                throw new FixtureException(
                    `Invalid segment: start=${startMs}ms, end=${endMs}ms`,
                    'INVALID_SEGMENT',
                );
            }

            const therapist = await this.therapistOnboarding.createFromAudio(
                sourceAudioPath,
                new AudioSegment(startMs, endMs),
                AudioState.DEV_THERAPIST_INPUT,
            );

            this.state$.lastTherapistUuid.set(therapist.getUuid());
            this.state$.notification.set({ message: `Therapist created: ${therapist.getUuid()}`, type: 'success' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.lastError.set(message);
            this.state$.notification.set({ message, type: 'error' });
            this.logger.error('AudioState: therapist onboarding failed', {
                message,
                stack: error instanceof Error ? error.stack : undefined,
            });

            if (error instanceof FixtureException) {
                throw error;
            }
            throw new FixtureException(
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

    private updateFileEntry(filePath: string, result: AudioIngest): void {
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
    AudioState,
    () =>
        new AudioState(
            Container.get(AudioScanner),
            Container.get(AudioFileEncryptor),
            Container.get(FixtureLoader),
            Container.get(TherapistRepository),
            Container.get(TherapistOnboarding),
            Container.get(AppLogger),
        ),
);
