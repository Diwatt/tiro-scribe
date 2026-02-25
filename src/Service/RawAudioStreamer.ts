/**
 * RawAudioStreamer - thin JS wrapper for the native streaming API exposed by
 * SecureRecorder.  The native module captures microphone audio, resamples to
 * 16 kHz mono PCM and invokes a worklet callback for each chunk.  The JS
 * layer merely maintains a single recorder instance and forwards start/stop
 * requests, making VoiceCalibrator and other clients simple.
 */

import { appLogger, type LoggerInterface } from './Logger';
import { SecureRecorder } from '../../modules/secure-recorder/src/index';

export interface WorkletCallback {
    (pcmChunk: Float32Array): void;
}

/**
 * Minimal interface representing the subset of SecureRecorder used by
 * the streaming API.  Exposed so that tests can provide a stub without
 * pulling in the real native module.
 */
export interface SecureRecorderLike {
    startStream?(cb: WorkletCallback): void;
    stopStream?(): void;
    dispose(): void;
}

/**
 * Factory used to create a fresh recorder instance for each session.  The
 * default implementation constructs a real `SecureRecorder` with a
 * timestamp‑based session id.  A custom factory may be injected for tests.
 */
export type RecorderFactory = () => SecureRecorderLike;

/**
 * Wrapper around the native streaming recorder.  The old static helper was
 * convenient but violated the DI rules in `standard.instructions.md` – it
 * instantiated `SecureRecorder` itself and held everything in static
 * properties.  This class obeys the style guide by accepting its
 * dependencies through the constructor, which makes unit testing and
 * eventual reuse easier.
 */
export class RawAudioStreamer {
    // ---------- static helpers for backwards compatibility --------------
    /**
     * Shared singleton instance used by legacy callers.  We export the class
     * and a pre‑constructed object; callers may migrate at leisure.  We
     * intentionally do not implement any compatibility layers in the
     * instance itself (see standard.instructions.md §10).
     */
    public static readonly shared = new RawAudioStreamer();

    /**
     * Replace the logger on the shared singleton (used from tests).
     */
    public static setLogger(l: LoggerInterface): void {
        RawAudioStreamer.shared.setLogger(l);
    }

    /**
     * Convenience forwarding to the shared singleton.  Existing tests still
     * import and call `RawAudioStreamer.start/stop` so we retain them for
     * now; new code should consume an instance via injection instead.
     */
    public static start(callback: WorkletCallback): void {
        RawAudioStreamer.shared.start(callback);
    }

    public static stop(): void {
        RawAudioStreamer.shared.stop();
    }

    // ---------- instance implementation --------------------------------
    private log: LoggerInterface;
    private readonly recorderFactory: RecorderFactory;
    private currentRecorder: SecureRecorderLike | null = null;

    constructor(
        logger: LoggerInterface = appLogger,
        recorderFactory: RecorderFactory = () =>
            new SecureRecorder(`raw-stream-${Date.now()}`),
    ) {
        this.log = logger;
        this.recorderFactory = recorderFactory;
    }

    public setLogger(logger: LoggerInterface): void {
        this.log = logger;
    }

    public start(callback: WorkletCallback): void {
        if (this.currentRecorder) {
            this.log.warn('[RawAudioStreamer] start() called while stream already active');
            return;
        }

        this.currentRecorder = this.recorderFactory();

        const recorder = this.currentRecorder as SecureRecorderLike;
        if (typeof recorder.startStream === 'function') {
            recorder.startStream(callback);
            this.log.debug('[RawAudioStreamer] streaming started');
        } else {
            this.log.error('[RawAudioStreamer] native startStream method missing');
            this.currentRecorder = null;
        }
    }

    public stop(): void {
        if (!this.currentRecorder) {
            this.log.warn('[RawAudioStreamer] stop() called with no active stream');
            return;
        }

        const recorder = this.currentRecorder as SecureRecorderLike;
        if (typeof recorder.stopStream === 'function') {
            recorder.stopStream();
            this.log.debug('[RawAudioStreamer] streaming stopped');
        } else {
            this.log.error('[RawAudioStreamer] native stopStream method missing');
        }

        this.currentRecorder.dispose();
        this.currentRecorder = null;
    }
}

/**
 * convenience alias exported for callers that used to depend on the
 * old static methods.  The `voiceCalibrator` module uses this name and
 * tests will eventually import the class directly instead.
 */
export const rawAudioStreamer = RawAudioStreamer.shared;
