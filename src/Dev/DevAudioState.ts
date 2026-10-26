import { observable } from '@legendapp/state';
import { Container } from '@/Core/Container';
import type { DevAudioIngest } from './Data/DevAudioIngest';
import { DevAudioScanner } from './DevAudioScanner';
import { DevFileEncryptor } from './DevFileEncryptor';
import { DevEncryptionException } from './DevEncryptionException';

export interface DevAudioFileEntry {
    name: string;
    path: string;
    sizeBytes: number;
    encryptedPath: string | null;
    isEncrypted: boolean;
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
    notification: DevAudioNotification | null;
}

const INITIAL_STATE: DevAudioStateSnapshot = {
    sourceDirectory: '',
    files: [],
    isLoading: false,
    lastResult: null,
    lastError: null,
    notification: null,
};

export class DevAudioState {
    public readonly state$ = observable(INITIAL_STATE);

    public constructor(
        private readonly scanner: DevAudioScanner,
        private readonly encryptor: DevFileEncryptor,
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
                ? { ...file, encryptedPath: result.outputFile.path, isEncrypted: true }
                : file,
        );
        this.state$.files.set(updatedFiles);
    }
}

Container.register(
    DevAudioState,
    () => new DevAudioState(Container.get(DevAudioScanner), Container.get(DevFileEncryptor)),
);
