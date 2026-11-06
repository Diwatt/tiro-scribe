import { observable } from '@legendapp/state';
import { documentDirectory } from 'expo-file-system/legacy';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Utterance } from '@/Entity';
import { StreamTranscriberFactory } from '@/Pipeline';
import { SessionTranscribeSnapshot } from '../Data/SessionTranscribeSnapshot';

/**
 * SessionTranscribe – Dev-console runner for the pull pipeline: opens a native
 * reader on an encrypted session (.dat), frames VAD windows and transcribes
 * every speech segment into utterances via the StreamTranscriber.
 */
export class SessionTranscribe {
    private static readonly DEFAULT_DAT_FILE_NAME = 'speech_thomas_16k.dat';

    public readonly state$ = observable(SessionTranscribeSnapshot.create());
    public readonly datPath$ = observable(SessionTranscribe.createDefaultDatPath());

    public constructor(
        private readonly transcriberFactory: StreamTranscriberFactory = Container.get(StreamTranscriberFactory),
        private readonly logger: AppLogger = Container.get(AppLogger),
    ) {}

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public setDatPath(path: string): void {
        this.datPath$.set(path);
    }

    public async runFromForm(): Promise<void> {
        await this.run(this.datPath$.get());
    }

    public async run(encryptedPath: string): Promise<void> {
        this.state$.isLoading.set(true);
        this.state$.error.set(null);
        this.state$.timings.set(null);

        try {
            const startedAt = Date.now();
            const transcriber = await this.transcriberFactory.create();
            const transcription = await transcriber.transcribe(encryptedPath);
            const elapsedMs = Date.now() - startedAt;

            this.state$.utterances.set(transcription.utterances);
            this.state$.timings.set(transcription.timings);
            this.state$.elapsedMs.set(elapsedMs);
            this.logger.debug('[SessionTranscribe] done', {
                utteranceCount: transcription.utterances.length,
                elapsedMs,
                decryptMs: transcription.timings.getDecryptMs(),
                vadMs: transcription.timings.getVadMs(),
                asrMs: transcription.timings.getAsrMs(),
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.error.set(message);
            this.logger.error('[SessionTranscribe] failed', { message });
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    private static createDefaultDatPath(): string {
        return `${(documentDirectory ?? '').replace('file://', '')}${SessionTranscribe.DEFAULT_DAT_FILE_NAME}`;
    }
}

Container.register(SessionTranscribe, () => new SessionTranscribe());
