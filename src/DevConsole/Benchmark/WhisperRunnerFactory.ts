import type { WhisperLanguage } from 'react-native-executorch';
import { createWhisperSpeechToText, download, models } from 'react-native-executorch';
import { Container } from '@/Core/Container';
import type { SpeechToTextRunner, SpeechToTextRunnerFactory } from '../State/SpeechToTextBenchmark';

/**
 * Loads the packaged whisper-small model through the executorch catalog and
 * adapts its runner to the engine-agnostic SpeechToTextRunner contract.
 * download() fetches the catalog sources and returns local paths: the native
 * loadModel only accepts bare file paths, never URLs.
 */
export class WhisperRunnerFactory implements SpeechToTextRunnerFactory {
    public async create(): Promise<SpeechToTextRunner> {
        const localModel = await download(models.speechToText.WHISPER.SMALL.DEFAULT);
        const runner = await createWhisperSpeechToText(localModel);
        return {
            transcribe: (audio: Float32Array, language: string) =>
                runner.transcribe(audio, { language: language as WhisperLanguage }),
            dispose: () => Promise.resolve(runner.dispose()),
        };
    }
}

Container.register(WhisperRunnerFactory, () => new WhisperRunnerFactory());
