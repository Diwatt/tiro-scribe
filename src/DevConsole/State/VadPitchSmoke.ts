import { observable } from '@legendapp/state';
import { documentDirectory } from 'expo-file-system/legacy';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Pitch, PitchEstimate, Vad } from '@/InferenceModel/Model';
import type { PitchConfig } from '@/InferenceModel/Model/PitchConfig';
import type { VadConfig } from '@/InferenceModel/Model/VadConfig';
import { Runtime } from '@/InferenceModel/Runtime';
import { SmokeCheck, SmokeCheckId, SmokeCheckStatus } from '../Data/SmokeCheck';
import { VadPitchSmokeSnapshot } from '../Data/VadPitchSmokeSnapshot';
import { AudioSegmentExtractor } from '../Ingest/AudioSegmentExtractor';
import { SourceIngestException } from '../Ingest/SourceIngestException';

/**
 * VadPitchSmoke – Dev-console smoke runner for the VAD and Pitch capabilities.
 *
 * Loads the real bundles through the Runtime (download included) and runs them
 * on calibrated PCM: TTS speech from the device documents folder, pure silence
 * and synthetic 220/440/880 Hz tones generated on device. Each check reports
 * pass/fail with its metrics so a defective model is caught on the console
 * card instead of weeks later inside the orchestrator.
 */
export class VadPitchSmoke {
    public static readonly SILENCE_WINDOW_COUNT = 10;
    public static readonly TONE_AMPLITUDE = 0.5;
    public static readonly TONE_FRAME_COUNT = 10;
    public static readonly TONE_FREQUENCIES_HZ = [220, 440, 880];
    public static readonly TONE_TOLERANCE = 0.01;
    public static readonly VOICE_PROBABILITY_THRESHOLD = 0.7;
    public static readonly SILENCE_PROBABILITY_THRESHOLD = 0.3;
    private static readonly DEFAULT_WAV_FILE_NAME = 'speech_thomas_16k.wav';
    private static readonly TONE_CHECK_IDS = new Map([
        [220, SmokeCheckId.PitchTone220],
        [440, SmokeCheckId.PitchTone440],
        [880, SmokeCheckId.PitchTone880],
    ]);

    public readonly state$ = observable(VadPitchSmokeSnapshot.create(VadPitchSmoke.createInitialChecks()));
    public readonly voiceWavPath$ = observable(VadPitchSmoke.createDefaultWavPath());

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly runtime: Runtime = Container.get(Runtime),
        private readonly segmentExtractor: AudioSegmentExtractor = Container.get(AudioSegmentExtractor),
    ) {}

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public get snapshot(): VadPitchSmokeSnapshot {
        return this.state$.get();
    }

    public setVoiceWavPath(path: string): void {
        this.voiceWavPath$.set(path);
    }

    public async runFromForm(): Promise<void> {
        await this.run(this.voiceWavPath$.get());
    }

    public async run(voiceWavPath: string): Promise<void> {
        this.state$.set(VadPitchSmokeSnapshot.create(VadPitchSmoke.createInitialChecks(), true));

        try {
            const voicePcm = await this.segmentExtractor.readFullPcm(voiceWavPath);
            if (voicePcm.length === 0) {
                throw new SourceIngestException('Voice audio is empty', 'SMOKE_AUDIO_EMPTY');
            }

            await this.runVadChecks(voicePcm);
            await this.runPitchChecks();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.error.set(message);
            this.logger.error('[VadPitchSmoke] failed', { message });
            throw error;
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public dismissError(): void {
        this.state$.error.set(null);
    }

    private static createDefaultWavPath(): string {
        return `${(documentDirectory ?? '').replace('file://', '')}${VadPitchSmoke.DEFAULT_WAV_FILE_NAME}`;
    }

    private static createInitialChecks(): SmokeCheck[] {
        const checks = [
            SmokeCheck.create(SmokeCheckId.VadVoice, 'VAD speech probability (voice)'),
            SmokeCheck.create(SmokeCheckId.VadSilence, 'VAD speech probability (silence)'),
        ];
        for (const toneHz of VadPitchSmoke.TONE_FREQUENCIES_HZ) {
            const checkId = VadPitchSmoke.TONE_CHECK_IDS.get(toneHz);
            if (checkId != null) {
                checks.push(SmokeCheck.create(checkId, `Pitch ${toneHz} Hz tone`));
            }
        }
        checks.push(SmokeCheck.create(SmokeCheckId.PitchSilence, 'Pitch silence (unvoiced)'));

        return checks;
    }

    private async runVadChecks(voicePcm: Float32Array): Promise<void> {
        const vad = await this.runtime.getModel<Vad>(Vad.CAPABILITY);
        const config = vad.getConfig();

        this.beginCheck(SmokeCheckId.VadVoice);
        vad.reset();
        const voiceProbs: number[] = [];
        for (const window of this.sliceWindows(voicePcm, config.windowSamples)) {
            voiceProbs.push(await vad.run(window));
        }
        this.completeProbabilityCheck(
            SmokeCheckId.VadVoice,
            'voice',
            voiceProbs,
            VadPitchSmoke.VOICE_PROBABILITY_THRESHOLD,
            true,
        );

        this.beginCheck(SmokeCheckId.VadSilence);
        vad.reset();
        const silenceProbs: number[] = [];
        const silenceWindow = new Float32Array(config.windowSamples);
        for (let index = 0; index < VadPitchSmoke.SILENCE_WINDOW_COUNT; index += 1) {
            silenceProbs.push(await vad.run(silenceWindow));
        }
        this.completeProbabilityCheck(
            SmokeCheckId.VadSilence,
            'silence',
            silenceProbs,
            VadPitchSmoke.SILENCE_PROBABILITY_THRESHOLD,
            false,
        );
    }

    private async runPitchChecks(): Promise<void> {
        const pitch = await this.runtime.getModel<Pitch>(Pitch.CAPABILITY);
        const config = pitch.getConfig();

        for (const toneHz of VadPitchSmoke.TONE_FREQUENCIES_HZ) {
            const checkId = VadPitchSmoke.TONE_CHECK_IDS.get(toneHz);
            if (checkId == null) {
                continue;
            }
            this.beginCheck(checkId);
            await this.completeToneCheck(pitch, config, toneHz, checkId);
        }

        this.beginCheck(SmokeCheckId.PitchSilence);
        await this.completePitchSilenceCheck(pitch, config);
    }

    private async completeToneCheck(
        pitch: Pitch,
        config: PitchConfig,
        toneHz: number,
        checkId: SmokeCheckId,
    ): Promise<void> {
        const estimates = await this.collectToneEstimates(pitch, config, toneHz);
        const voicedHz = estimates.filter((estimate) => estimate.hz > 0).map((estimate) => estimate.hz);
        const medianHz = this.median(voicedHz);
        const deviation = Math.abs(medianHz - toneHz) / toneHz;
        const summary = `target ${toneHz} Hz, measured ${medianHz.toFixed(2)} Hz over ${estimates.length} frames`;
        const passed = voicedHz.length > 0 && deviation <= VadPitchSmoke.TONE_TOLERANCE;
        const failureReason = passed
            ? null
            : voicedHz.length === 0
              ? 'no voiced frame: CREPE returned no frequency estimate'
              : `median ${medianHz.toFixed(2)} Hz deviates by ${(deviation * 100).toFixed(2)}% from ${toneHz} Hz (tolerance 1%)`;
        this.replaceCheck(checkId, passed ? SmokeCheckStatus.Passed : SmokeCheckStatus.Failed, summary, failureReason);
    }

    private async completePitchSilenceCheck(pitch: Pitch, config: PitchConfig): Promise<void> {
        const silenceWindow = new Float32Array(config.frameSamples);
        const estimates: PitchEstimate[] = [];
        for (let index = 0; index < VadPitchSmoke.TONE_FRAME_COUNT; index += 1) {
            estimates.push(await pitch.run(silenceWindow));
        }
        const voicedCount = estimates.filter((estimate) => estimate.hz > 0).length;
        const passed = voicedCount === 0;
        const summary = `${estimates.length - voicedCount}/${estimates.length} frames unvoiced`;
        const failureReason = passed ? null : `${voicedCount} silent frames came back voiced (hz > 0)`;
        this.replaceCheck(
            SmokeCheckId.PitchSilence,
            passed ? SmokeCheckStatus.Passed : SmokeCheckStatus.Failed,
            summary,
            failureReason,
        );
    }

    private async collectToneEstimates(
        pitch: Pitch,
        config: PitchConfig,
        toneHz: number,
    ): Promise<PitchEstimate[]> {
        const signal = this.generateToneSamples(
            toneHz,
            config.frameSamples,
            config.sampleRateHz,
            VadPitchSmoke.TONE_FRAME_COUNT,
        );
        const estimates: PitchEstimate[] = [];
        for (let frameIndex = 0; frameIndex < VadPitchSmoke.TONE_FRAME_COUNT; frameIndex += 1) {
            const offset = frameIndex * config.frameSamples;
            estimates.push(await pitch.run(signal.subarray(offset, offset + config.frameSamples)));
        }

        return estimates;
    }

    private completeProbabilityCheck(
        checkId: SmokeCheckId,
        label: string,
        probabilities: number[],
        threshold: number,
        isVoice: boolean,
    ): void {
        const mean = probabilities.reduce((total, value) => total + value, 0) / probabilities.length;
        const summary = `${label}: mean ${mean.toFixed(3)} over ${probabilities.length} windows`;
        const passed = isVoice ? mean > threshold : mean < threshold;
        const failureReason = passed
            ? null
            : `mean probability ${mean.toFixed(3)} ${isVoice ? 'did not exceed' : 'did not stay below'} ${threshold}`;
        this.replaceCheck(checkId, passed ? SmokeCheckStatus.Passed : SmokeCheckStatus.Failed, summary, failureReason);
    }

    private generateToneSamples(
        frequencyHz: number,
        frameSamples: number,
        sampleRateHz: number,
        frameCount: number,
    ): Float32Array {
        const signal = new Float32Array(frameSamples * frameCount);
        for (let index = 0; index < signal.length; index += 1) {
            signal[index] = VadPitchSmoke.TONE_AMPLITUDE * Math.sin((2 * Math.PI * frequencyHz * index) / sampleRateHz);
        }

        return signal;
    }

    private sliceWindows(pcm: Float32Array, windowSamples: number): Float32Array[] {
        const windows: Float32Array[] = [];
        for (let offset = 0; offset + windowSamples <= pcm.length; offset += windowSamples) {
            windows.push(pcm.slice(offset, offset + windowSamples));
        }

        return windows;
    }

    private median(values: number[]): number {
        if (values.length === 0) {
            return 0;
        }
        const sorted = [...values].sort((first, second) => first - second);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }

        return sorted[middle];
    }

    private beginCheck(checkId: SmokeCheckId): void {
        const check = this.findCheck(checkId);
        this.state$.checks.set(
            this.state$.checks.get().map((entry) => (entry.id === checkId ? check.withStatus(SmokeCheckStatus.Running, '', null) : entry)),
        );
    }

    private replaceCheck(
        checkId: SmokeCheckId,
        status: SmokeCheckStatus,
        summary: string,
        failureReason: string | null,
    ): void {
        const check = this.findCheck(checkId);
        this.state$.checks.set(
            this.state$.checks.get().map((entry) => (entry.id === checkId ? check.withStatus(status, summary, failureReason) : entry)),
        );
    }

    private findCheck(checkId: SmokeCheckId): SmokeCheck {
        const check = this.state$.checks.get().find((entry) => entry.id === checkId);
        if (check == null) {
            throw new SourceIngestException(`Smoke check ${checkId} is missing from the snapshot`, 'SMOKE_CHECK_MISSING');
        }

        return check;
    }
}

Container.register(
    VadPitchSmoke,
    () =>
        new VadPitchSmoke(
            Container.get(AppLogger),
            Container.get(Runtime),
            Container.get(AudioSegmentExtractor),
        ),
);
