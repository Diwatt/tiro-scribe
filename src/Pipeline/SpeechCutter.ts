import { PipelineException } from '@/Exception';
import { SpeechSegment } from './SpeechSegment';

export enum SpeechCutterState {
    WaitingForSpeech = 'waiting_for_speech',
    CollectingSpeech = 'collecting_speech',
}

/**
 * SpeechCutter - cuts the stream into speech segments by listening to the VAD
 * window by window. A segment opens on a voiced window plus a short pre-roll
 * of the preceding silence, and closes once a sustained silence tail follows
 * a long enough span; a span reaching the 28 s cap is cut immediately and the
 * next one starts on the following window. Fragments abandoned by early
 * silence are dropped, and segments never overlap.
 */
export class SpeechCutter {
    public static readonly VOICED_THRESHOLD = 0.5;
    public static readonly SILENCE_THRESHOLD = 0.35;
    public static readonly MIN_SEGMENT_DURATION_MS = 2000;
    public static readonly MAX_SEGMENT_DURATION_MS = 28000;
    public static readonly SILENCE_WINDOWS_TO_CLOSE = 3;
    public static readonly PRE_ROLL_WINDOWS = 10;

    private lastEndSample = 0;
    private preRoll: Float32Array[] = [];
    private receivedSamples = 0;
    private segmentStartSample = 0;
    private segmentWindows: Float32Array[] = [];
    private silenceWindowCount = 0;
    private readonly sampleRateHz: number;
    private state: SpeechCutterState = SpeechCutterState.WaitingForSpeech;
    private readonly windowSamples: number;

    public constructor(windowSamples: number, sampleRateHz: number) {
        if (windowSamples <= 0 || sampleRateHz <= 0) {
            throw new PipelineException(
                `SpeechCutter requires a positive window size and sample rate, got ${windowSamples} / ${sampleRateHz}`,
            );
        }

        this.windowSamples = windowSamples;
        this.sampleRateHz = sampleRateHz;
    }

    /**
     * Listen to one VAD window with its speech probability; returns the
     * segment that closes on this window, null otherwise.
     */
    public cut(window: Float32Array, speechProbability: number): SpeechSegment | null {
        if (window.length !== this.windowSamples) {
            throw new PipelineException(
                `SpeechCutter expects ${this.windowSamples} samples per window, got ${window.length}`,
            );
        }

        this.receivedSamples += window.length;

        if (this.state === SpeechCutterState.WaitingForSpeech) {
            return this.searchForSpeechStart(window, speechProbability);
        }

        return this.searchForSpeechEnd(window, speechProbability);
    }

    /**
     * End of the stream: returns the open segment when it is long enough to
     * transcribe, drops it otherwise.
     */
    public endOfStream(): SpeechSegment | null {
        if (this.state === SpeechCutterState.WaitingForSpeech) {
            return null;
        }

        if (this.getCollectedDurationMs() < SpeechCutter.MIN_SEGMENT_DURATION_MS) {
            this.discardSegment();

            return null;
        }

        return this.closeSegment();
    }

    public reset(): void {
        this.state = SpeechCutterState.WaitingForSpeech;
        this.preRoll = [];
        this.segmentWindows = [];
        this.receivedSamples = 0;
        this.segmentStartSample = 0;
        this.lastEndSample = 0;
        this.silenceWindowCount = 0;
    }

    private searchForSpeechStart(window: Float32Array, speechProbability: number): SpeechSegment | null {
        this.preRoll.push(window);
        if (this.preRoll.length > SpeechCutter.PRE_ROLL_WINDOWS) {
            this.preRoll.shift();
        }

        if (speechProbability < SpeechCutter.VOICED_THRESHOLD) {
            return null;
        }

        this.openSegment(window);

        return null;
    }

    private searchForSpeechEnd(window: Float32Array, speechProbability: number): SpeechSegment | null {
        this.segmentWindows.push(window);

        const isSilent = speechProbability < SpeechCutter.SILENCE_THRESHOLD;
        if (isSilent) {
            this.silenceWindowCount += 1;
            if (this.silenceWindowCount >= SpeechCutter.SILENCE_WINDOWS_TO_CLOSE) {
                if (this.getCollectedDurationMs() >= SpeechCutter.MIN_SEGMENT_DURATION_MS) {
                    return this.closeSegment();
                }

                this.discardSegment();
            }

            return null;
        }

        this.silenceWindowCount = 0;
        if (this.getCollectedDurationMs() >= SpeechCutter.MAX_SEGMENT_DURATION_MS) {
            const segment = this.closeSegment();
            this.segmentStartSample = this.receivedSamples;
            this.state = SpeechCutterState.CollectingSpeech;

            return segment;
        }

        return null;
    }

    private openSegment(firstSpokenWindow: Float32Array): void {
        this.segmentWindows = [...this.preRoll, firstSpokenWindow];
        this.preRoll = [];
        const windowCount = this.segmentWindows.length;
        const bufferStartSample = this.receivedSamples - windowCount * this.windowSamples;
        const clippedWindows = Math.max(
            0,
            Math.ceil((this.lastEndSample - bufferStartSample) / this.windowSamples),
        );
        this.segmentWindows.splice(0, clippedWindows);
        this.segmentStartSample = bufferStartSample + clippedWindows * this.windowSamples;
        this.silenceWindowCount = 0;
        this.state = SpeechCutterState.CollectingSpeech;
    }

    private closeSegment(): SpeechSegment {
        const segment = new SpeechSegment(
            this.toMilliseconds(this.segmentStartSample),
            this.toMilliseconds(this.receivedSamples),
            SpeechCutter.concat(this.segmentWindows),
        );

        this.lastEndSample = this.receivedSamples;
        this.segmentWindows = [];
        this.silenceWindowCount = 0;
        this.state = SpeechCutterState.WaitingForSpeech;

        return segment;
    }

    private discardSegment(): void {
        this.segmentWindows = [];
        this.silenceWindowCount = 0;
        this.state = SpeechCutterState.WaitingForSpeech;
    }

    private getCollectedDurationMs(): number {
        return this.toMilliseconds(this.receivedSamples - this.segmentStartSample);
    }

    private toMilliseconds(samples: number): number {
        return Math.round((samples / this.sampleRateHz) * 1000);
    }

    private static concat(windows: Float32Array[]): Float32Array {
        const total = windows.reduce((sum, window) => sum + window.length, 0);
        const merged = new Float32Array(total);
        let offset = 0;

        for (const window of windows) {
            merged.set(window, offset);
            offset += window.length;
        }

        return merged;
    }
}
