import { SecureRecorderModule, type RecordingStatus, type DecryptedChunkEvent } from './SecureRecorderModule';
import type { EventSubscription } from 'expo-modules-core';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { ErrorNormalizer } from './ErrorNormalizer';
import { PermissionManager } from './PermissionManager';
import { DecryptionManager } from './DecryptionManager';
import type { EventEmitter, NativeRecorderModule, SecureRecorderError, StatusChangeEvent } from './Type';
import { ErrorCode } from './ErrorCode';
import { RecorderState } from './RecorderState';

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
  private errorNormalizer: ErrorNormalizer;
  private eventSubscription: EventSubscription | null = null;
  private readonly _sessionId: string;
  private _state: RecorderState = RecorderState.INACTIVE;
  private _filePath: string | null = null;
  private nativeModule: NativeRecorderModule;
  private eventEmitter: EventEmitter;
  
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
    eventEmitter: EventEmitter = SecureRecorderModule as any
  ) {
    // Initialize dependencies first
    this.errorNormalizer = new ErrorNormalizer();
    this.nativeModule = nativeModule;
    this.eventEmitter = eventEmitter;

    // Validate session ID
    if (!sessionId || sessionId.trim().length === 0) {
      throw this.createError(ErrorCode.INVALID_SESSION_ID, 'Session ID cannot be empty');
    }

    this._sessionId = sessionId;

    // Subscribe to native status changes
    this.eventSubscription = this.eventEmitter.addListener(
      'onRecordingStatusChanged',
      (status: RecordingStatus) => {
        this._updateStateFromStatus(status);
      }
    ) as EventSubscription;

    // Initialize state from native module
    this._syncState();
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
    return this.state === RecorderState.RECORDING;
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

    if (currentState === RecorderState.RECORDING) {
      throw this.createError(ErrorCode.RECORDING_IN_PROGRESS, 'Recording is already in progress');
    }

    if (currentState === RecorderState.STOPPED) {
      throw this.createError(
        ErrorCode.RECORDER_STOPPED,
        'Recorder has been stopped. Create a new instance to record again.'
      );
    }

    try {
      const filePath = await this.nativeModule.startRecording(this._sessionId);
      this._filePath = filePath;
      // State will be updated via event listener
    } catch (error) {
      const normalizedError = this.errorNormalizer.normalize(error);
      this._handleError(normalizedError);
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
    if (this.state !== RecorderState.RECORDING) {
      throw this.createError(ErrorCode.NO_RECORDING_IN_PROGRESS, 'No recording is currently in progress');
    }

    try {
      const filePath = await this.nativeModule.stopRecording();
      // State will be updated via event listener
      return filePath;
    } catch (error) {
      const normalizedError = this.errorNormalizer.normalize(error);
      this._handleError(normalizedError);
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
    return await SecureRecorder.getPermissionManager().hasPermission();
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
    return await SecureRecorder.getPermissionManager().requestPermission();
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
  public static addDecryptionListener(listener: (event: DecryptedChunkEvent) => void): EventSubscription {
    return SecureRecorderModule.addListener(SecureRecorderModule.EVENT_AUDIO_CHUNK_DECRYPTED, listener);
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
  
  private async _syncState(): Promise<void> {
    try {
      const status = await this.nativeModule.getStatus();
      this._updateStateFromStatus(status);
    } catch {
      // Ignore errors during initial sync
    }
  }

  private _updateStateFromStatus(status: RecordingStatus): void {
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

  private _handleError(error: SecureRecorderError): void {
    if (this.onerror) {
      this.onerror(error);
    }
  }

  private createError(code: ErrorCode, message: string, details?: unknown): SecureRecorderError {
    return this.errorNormalizer.createError(code, message, details);
  }

  // Static factory for PermissionManager (for backward compatibility)
  private static getPermissionManager(): PermissionManager {
    if (!SecureRecorder.permissionManager) {
      SecureRecorder.permissionManager = new PermissionManager(
        SecureRecorderModule,
        requestRecordingPermissionsAsync
      );
    }
    return SecureRecorder.permissionManager;
  }

  // Static factory for DecryptionManager (for backward compatibility)
  private static getDecryptionManager(): DecryptionManager {
    if (!SecureRecorder.decryptionManager) {
      SecureRecorder.decryptionManager = new DecryptionManager(SecureRecorderModule);
    }
    return SecureRecorder.decryptionManager;
  }
}
