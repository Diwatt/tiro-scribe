import { PipelineException } from '@/Exception';
import type { AsrRunInput } from './AsrRunInput';
import type { AsrRunInputBuilder } from './AsrRunInputBuilder';

export enum AudioCutterState {
    WaitingForVoice = 'waiting_for_voice',
    CollectingVoice = 'collecting_voice',
    ScanningSilence = 'scanning_silence',
}

/**
 * AudioCutter - decides where the stream is cut: voice segments with
 * hysteresis, a minimum duration below which a segment is dropped, and a
 * forced cut at the segment limit. Pure policy: every stored window goes
 * through the AsrRunInputBuilder, which owns the input budget, the
 * stream-time anchors and the emission. An input therefore covers a much
 * longer real time than its stored audio, never exceeds the frozen ASR
 * window, and segments dropped before the minimum duration never reach
 * transcription.
 */
export class AudioCutter {
    public static readonly VOICED_THRESHOLD = 0.5;
    public static readonly SILENCE_THRESHOLD = 0.35;
    public static readonly MIN_SEGMENT_DURATION_MS = 2000;
    public static readonly MAX_SEGMENT_DURATION_MS = 28000;
    public static readonly SILENCE_WINDOWS_TO_CLOSE = 3;
    public static readonly PRE_ROLL_WINDOWS = 10;

    private readonly builder: AsrRunInputBuilder;
    private isSegmentOpen = false;
    private lastStockedEndSample = 0;
    private preRoll: Float32Array[] = [];
    private receivedSamples = 0;
    private nbSilenceWindows = 0;
    private segmentStartSample = 0;
    private state: AudioCutterState = AudioCutterState.WaitingForVoice;
    private readonly sampleRateHz: number;
    private readonly windowSamples: number;

    public constructor(windowSamples: number, sampleRateHz: number, builder: AsrRunInputBuilder) {
        if (windowSamples <= 0 || sampleRateHz <= 0) {
            throw new PipelineException(
                `AudioCutter requires a positive window size and sample rate, got ${windowSamples} / ${sampleRateHz}`,
            );
        }

        this.windowSamples = windowSamples;
        this.sampleRateHz = sampleRateHz;
        this.builder = builder;
    }

    /**
     * Listen to one VAD window with its speech probability; returns the run
     * input that closes on this window, null otherwise.
     */
    public cut(window: Float32Array, speechProbability: number): AsrRunInput | null {
        if (window.length !== this.windowSamples) {
            throw new PipelineException(
                `AudioCutter expects ${this.windowSamples} samples per window, got ${window.length}`,
            );
        }

        this.receivedSamples += window.length;

        if (this.state === AudioCutterState.WaitingForVoice) {
            return this.waitForVoice(window, speechProbability);
        }

        if (this.state === AudioCutterState.ScanningSilence) {
            return this.scanSilence(window, speechProbability);
        }

        return this.collectVoice(window, speechProbability);
    }

    /**
     * End of the stream: settles the open segment and returns the input under
     * construction when it holds at least one transcribed segment, drops it
     * otherwise.
     */
    public endOfStream(): AsrRunInput | null {
        if (this.state === AudioCutterState.WaitingForVoice) {
            return null;
        }

        this.settleOpenSegment(this.receivedSamples);

        return this.builder.flush(this.lastStockedEndSample);
    }

    public reset(): void {
        this.builder.reset();
        this.isSegmentOpen = false;
        this.lastStockedEndSample = 0;
        this.preRoll = [];
        this.receivedSamples = 0;
        this.nbSilenceWindows = 0;
        this.state = AudioCutterState.WaitingForVoice;
    }

    private waitForVoice(window: Float32Array, speechProbability: number): AsrRunInput | null {
        if (speechProbability < AudioCutter.VOICED_THRESHOLD) {
            this.pushPreRoll(window);

            return null;
        }

        this.openSegmentAfterGap(window, speechProbability);

        return null;
    }

    private scanSilence(window: Float32Array, speechProbability: number): AsrRunInput | null {
        if (speechProbability < AudioCutter.VOICED_THRESHOLD) {
            this.pushPreRoll(window);

            return null;
        }

        const emitted = this.flushRunInputBeforeOverflow(this.preRoll.length + 1);
        this.openSegmentAfterGap(window, speechProbability);

        return emitted;
    }

    private collectVoice(window: Float32Array, speechProbability: number): AsrRunInput | null {
        const emitted = this.flushRunInputBeforeOverflow(1);
        this.storeInSegment(window, speechProbability);

        return emitted;
    }

    private openSegmentAfterGap(window: Float32Array, speechProbability: number): void {
        this.segmentStartSample = this.receivedSamples - (this.preRoll.length + 1) * this.windowSamples;
        this.builder.openSegment(this.preRoll);
        this.preRoll = [];
        this.state = AudioCutterState.CollectingVoice;
        this.isSegmentOpen = true;
        this.nbSilenceWindows = 0;
        this.storeInSegment(window, speechProbability);
    }

    private storeInSegment(window: Float32Array, speechProbability: number): void {
        this.builder.store(window);
        this.lastStockedEndSample = this.receivedSamples;

        if (speechProbability < AudioCutter.SILENCE_THRESHOLD) {
            this.nbSilenceWindows += 1;
            if (this.nbSilenceWindows >= AudioCutter.SILENCE_WINDOWS_TO_CLOSE) {
                this.settleOpenSegment(this.receivedSamples);
                this.state = AudioCutterState.ScanningSilence;
            }

            return;
        }

        this.nbSilenceWindows = 0;
        if (this.getSegmentDurationMs(this.receivedSamples) >= AudioCutter.MAX_SEGMENT_DURATION_MS) {
            this.builder.closeSegment(this.receivedSamples);
            this.segmentStartSample = this.receivedSamples;
        }
    }

    /** Closes the open segment when long enough, drops it otherwise, on the given boundary. */
    private settleOpenSegment(endSample: number): void {
        if (!this.isSegmentOpen) {
            return;
        }

        if (this.getSegmentDurationMs(endSample) >= AudioCutter.MIN_SEGMENT_DURATION_MS) {
            this.builder.closeSegment(endSample);
        } else {
            this.builder.dropSegment();
        }

        this.isSegmentOpen = false;
        this.nbSilenceWindows = 0;
    }

    /** Emits the run input when the incoming windows would overflow the frozen ASR window. */
    private flushRunInputBeforeOverflow(incomingNbWindows: number): AsrRunInput | null {
        if (this.builder.canAccept(incomingNbWindows)) {
            return null;
        }

        this.settleOpenSegment(this.receivedSamples - this.windowSamples);
        const input = this.builder.flush(this.receivedSamples - this.windowSamples);

        if (this.state === AudioCutterState.CollectingVoice) {
            this.isSegmentOpen = true;
            this.segmentStartSample = this.receivedSamples - this.windowSamples;
        }

        return input;
    }

    private pushPreRoll(window: Float32Array): void {
        this.preRoll.push(window);
        if (this.preRoll.length > AudioCutter.PRE_ROLL_WINDOWS) {
            this.preRoll.shift();
        }
    }

    private getSegmentDurationMs(endSample: number): number {
        return Math.round(((endSample - this.segmentStartSample) / this.sampleRateHz) * 1000);
    }
}
