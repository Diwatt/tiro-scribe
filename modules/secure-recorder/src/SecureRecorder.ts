import type { EventSubscription } from 'expo-modules-core';
import { DecryptionManager } from './DecryptionManager';
import { ErrorCode } from './ErrorCode';
import { ErrorNormalizer } from './ErrorNormalizer';
import { PermissionManager } from './PermissionManager';
import { RecorderState } from './RecorderState';
import { type DecryptedChunkEvent, type RecordingStatus, SecureRecorderModule } from './SecureRecorderModule';
import type { EventEmitter, NativeRecorderModule, SecureRecorderError, StatusChangeEvent } from './Type';

// Re-export DecryptedChunkEvent for convenience
export type { DecryptedChunkEvent } from './SecureRecorderModule';

/**
 * Secure audio recorder with streaming AES-256-GCM encryption.
 * Audio data is encrypted in real-time before being written to disk.
 *
 * Follows MediaRecorder API patterns for consistency with web standards.
 *
 * @example
 * ```typescript
 * const recorder = new SecureRecorder('session-123');
 * await recorder.init();
 *
 * recorder.onstatuschange = (event) => {
 *   console.log('State:', event.state);
 * };
 *
 * recorder.onerror = (error) => {
 *   console.error('Error:', error);
 * };
 *
 * await recorder.start();
 * // ... recording ...
 * const filePath = await recorder.stop();
 * ```
 */
export class SecureRecorder {
    private readonly errorNormalizer: ErrorNormalizer;
    private eventSubscription: EventSubscription | null = null;
    private readonly _sessionId: string;
    private _state: RecorderState = RecorderState.Inactive;
    private _filePath: string | null = null;
    private readonly nativeModule: NativeRecorderModule;
    private readonly eventEmitter: EventEmitter;

    private static permissionManager: PermissionManager | null = null;
    private static decryptionManager: DecryptionManager | null = null;

    /**
     * Event handler called when recording status changes.
     * Similar to MediaRecorder.onstart, onstop, etc.
     */
    public onstatuschange: ((event: StatusChangeEvent) => void) | null = null;

    /**
     * Event handler called when a recording error occurs.
     * Similar to MediaRecorder.onerror.
     */
    public onerror: ((error: SecureRecorderError) => void) | null = null;

    /**
     * Creates a new SecureRecorder instance.
     *
     * Uses dependency injection for testability and flexibility.
     * Defaults to real implementations if not provided.
     *
     * @param sessionId - Unique identifier for the recording session. File will be named `{sessionId}.dat`
     * @param nativeModule - Native module implementation (defaults to SecureRecorderModule)
     * @param eventEmitter - Event emitter implementation (defaults to SecureRecorderEventEmitter)
     */
    public constructor(
        sessionId: string,
        nativeModule: NativeRecorderModule = SecureRecorderModule,
        eventEmitter: EventEmitter = SecureRecorderModule,
    ) {
        // Initialize dependencies first
        this.errorNormalizer = new ErrorNormalizer();
        this.nativeModule = nativeModule;
        this.eventEmitter = eventEmitter;

        // Validate session ID
        if (!sessionId || sessionId.trim().length === 0) {
            throw this.createError(ErrorCode.InvalidSessionId, 'Session ID cannot be empty');
        }

        this._sessionId = sessionId;

        // Event subscription moved to initialize() since addListener is now async
    }

    /**
     * Initialize the recorder by synchronizing state with the native module.
     * Call this method after creating a new SecureRecorder instance.
     *
     * @example
     * ```typescript
     * const recorder = new SecureRecorder('session-123');
     * await recorder.initialize();
     * ```
     */
    public async initialize(): Promise<void> {
        // Subscribe to native status changes (async since addListener is now async)
        if (this.eventSubscription === null) {
            this.eventSubscription = (await this.eventEmitter.addListener(
                'onRecordingStatusChanged',
                (status: RecordingStatus) => {
                    this.updateStateFromStatus(status);
                },
            )) as EventSubscription;
        }

        await this.syncState();
    }

    /**
     * Current recording state.
     * - INACTIVE: Not recording, ready to start
     * - RECORDING: Currently recording
     * - STOPPED: Recording completed or stopped
     */
    public get state(): RecorderState {
        return this._state;
    }

    /**
     * Whether a recording is currently active.
     * Computed from state property.
     */
    public get recording(): boolean {
        return this.state === RecorderState.Recording;
    }

    /**
     * Current session ID.
     */
    public get sessionId(): string {
        return this._sessionId;
    }

    /**
     * Path to the encrypted recording file, or null if not recording/stopped.
     */
    public get filePath(): string | null {
        return this._filePath;
    }

    /**
     * Starts recording audio with streaming encryption.
     *
     * @throws {SecureRecorderError} If recording fails, permission is denied, or encryption setup fails
     */
    public async start(): Promise<void> {
        const currentState = this.state;

        if (currentState === RecorderState.Recording) {
            throw this.createError(ErrorCode.RecordingInProgress, 'Recording is already in progress');
        }

        if (currentState === RecorderState.Stopped) {
            throw this.createError(
                ErrorCode.RecorderStopped,
                'Recorder has been stopped. Create a new instance to record again.',
            );
        }

        if (currentState === RecorderState.Paused) {
            throw this.createError(
                ErrorCode.InvalidState,
                'Recording is paused. Use resume() instead.',
            );
        }

        try {
            const filePath = await this.nativeModule.start(this._sessionId);
            this._filePath = filePath;
            // State will be updated via event listener
        } catch (error) {
            const normalizedError = this.errorNormalizer.normalize(error);
            this.handleError(normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Pauses the current recording. File remains open.
     * Call resume() to continue recording to the same file.
     *
     * @returns Promise that resolves to the absolute path of the encrypted file
     * @throws {SecureRecorderError} If no recording is active or pausing fails
     */
    public async pause(): Promise<string> {
        if (this.state !== RecorderState.Recording) {
            throw this.createError(ErrorCode.NoRecordingInProgress, 'No recording is currently in progress');
        }

        try {
            const filePath = await this.nativeModule.pause();
            return filePath;
        } catch (error) {
            const normalizedError = this.errorNormalizer.normalize(error);
            this.handleError(normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Resumes a paused recording. Continues writing to the same file.
     *
     * @returns Promise that resolves to the absolute path of the encrypted file
     * @throws {SecureRecorderError} If recording is not paused or resuming fails
     */
    public async resume(): Promise<string> {
        if (this.state !== RecorderState.Paused) {
            throw this.createError(ErrorCode.InvalidState, 'Recording is not paused. Use start() to begin a new recording.');
        }

        try {
            const filePath = await this.nativeModule.resume();
            return filePath;
        } catch (error) {
            const normalizedError = this.errorNormalizer.normalize(error);
            this.handleError(normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Stops the current recording session.
     *
     * @returns Promise that resolves to the absolute path of the encrypted file
     * @throws {SecureRecorderError} If no recording is active or stopping fails
     */
    public async stop(): Promise<string> {
        if (this.state !== RecorderState.Recording && this.state !== RecorderState.Paused) {
            throw this.createError(ErrorCode.NoRecordingInProgress, 'No recording is currently in progress');
        }

        try {
            const filePath = await this.nativeModule.stop();
            // State will be updated via event listener
            return filePath;
        } catch (error) {
            const normalizedError = this.errorNormalizer.normalize(error);
            this.handleError(normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Cleans up resources and unsubscribes from events.
     * Call this when the recorder instance is no longer needed.
     */
    public dispose(): void {
        if (this.eventSubscription) {
            this.eventSubscription.remove();
            this.eventSubscription = null;
        }
    }

    /**
     * Checks if microphone permission is granted.
     * Static utility method (like MediaDevices.getUserMedia).
     */
    public static async hasPermission(): Promise<boolean> {
        return await (await SecureRecorder.getPermissionManager()).hasPermission();
    }

    /**
     * Requests microphone permission from the user.
     * Uses expo-audio internally to handle permission requests.
     * Static utility method (like MediaDevices.getUserMedia).
     *
     * @returns Promise that resolves to true if permission granted, false otherwise
     * @throws {SecureRecorderError} If permission request fails
     */
    public static async requestPermission(): Promise<boolean> {
        return await (await SecureRecorder.getPermissionManager()).requestPermission();
    }

    /**
     * Subscribe to the streaming decryption events.
     * MUST be called BEFORE calling stream().
     *
     * @param listener Callback function that receives decrypted chunks
     * @returns Subscription object (call .remove() when done)
     *
     * @example
     * const subscription = SecureRecorder.addDecryptionListener((event) => {
     *   const pcmData = event.data; // Uint8Array
     *   await onnxSession.processChunk(pcmData);
     *   if (event.isLast) {
     *     subscription.remove(); // Clean up when done
     *   }
     * });
     *
     * await SecureRecorder.stream(filePath);
     */
    public static async addDecryptionListener(listener: (event: DecryptedChunkEvent) => void): Promise<EventSubscription> {
        return await SecureRecorderModule.addListener(SecureRecorderModule.eventAudioChunkDecrypted, listener);
    }

    /**
     * Stream decrypt encrypted audio file, emitting events for each chunk.
     *
     * MEMORY SAFE: Uses true streaming to read chunks incrementally from disk.
     * Listen to 'onAudioChunkDecrypted' events to receive chunks as they're decrypted.
     *
     * IMPORTANT: Call addDecryptionListener() BEFORE calling stream() to receive events.
     *
     * @param encryptedPath Path to the encrypted audio file
     * @returns Promise that resolves when decryption starts (events are emitted asynchronously)
     *
     * @example
     * const subscription = SecureRecorder.addDecryptionListener((event) => {
     *   const pcmData = event.data; // Uint8Array
     *   await onnxSession.processChunk(pcmData);
     *   if (event.isLast) {
     *     subscription.remove();
     *   }
     * });
     *
     * await SecureRecorder.stream(filePath);
     */
    public static async stream(encryptedPath: string): Promise<void> {
        return await SecureRecorder.getDecryptionManager().stream(encryptedPath);
    }

    private async syncState(): Promise<void> {
        const status = await this.nativeModule.getStatus();
        this.updateStateFromStatus(status);
    }

    private updateStateFromStatus(status: RecordingStatus): void {
        const previousState = this._state;

        // Native code now returns state directly, no conversion needed
        this._state = status.state;
        this._filePath = status.filePath;

        // Fire status change event if state changed
        if (previousState !== this._state && this.onstatuschange) {
            this.onstatuschange({
                state: this._state,
                sessionId: this._sessionId,
                filePath: this._filePath,
                reason: status.reason,
            });
        }
    }

    private handleError(error: SecureRecorderError): void {
        if (this.onerror) {
            this.onerror(error);
        }
    }

    private createError(code: ErrorCode, message: string, details?: unknown): SecureRecorderError {
        return this.errorNormalizer.createError(code, message, details);
    }

    // Static factory for PermissionManager (for backward compatibility)
    // Lazy-imports expo-audio to prevent PlatformConstants TurboModule crash
    // during module evaluation (the static import chain forces expo-audio to
    // initialize before the native module registry is ready).
    private static async getPermissionManager(): Promise<PermissionManager> {
        SecureRecorder.permissionManager ??= new PermissionManager(
            SecureRecorderModule,
            async () => {
                const { requestRecordingPermissionsAsync } = await import('expo-audio');
                return await requestRecordingPermissionsAsync();
            },
        );

        return SecureRecorder.permissionManager;
    }

    // Static factory for DecryptionManager (for backward compatibility)
    private static getDecryptionManager(): DecryptionManager {
        SecureRecorder.decryptionManager ??= new DecryptionManager(SecureRecorderModule);

        return SecureRecorder.decryptionManager;
    }
}
