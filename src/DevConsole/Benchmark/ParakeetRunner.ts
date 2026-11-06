import type { Asr } from '@/InferenceModel/Model';
import type { SpeechToTextRunner } from '../State/SpeechToTextBenchmark';

/**
 * ParakeetRunner - adapts the Parakeet ASR capability (Runtime-owned,
 * native mel front-end) to the engine-agnostic SpeechToTextRunner contract.
 * Parakeet v3 is multilingual: the language hint is accepted but unused.
 */
export class ParakeetRunner implements SpeechToTextRunner {
    public constructor(private readonly model: Asr) {}

    public async transcribe(audio: Float32Array, _language: string): Promise<string> {
        const result = await this.model.run(audio);

        return result.text;
    }

    public async dispose(): Promise<void> {
        return this.model.dispose();
    }
}
