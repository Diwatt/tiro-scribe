import { requireOptionalNativeModule } from 'expo-modules-core';
import { StopReason } from './StopReason';
import { RecorderState } from './RecorderState';

/**
 * Event payload for decrypted audio chunks
 * 
 * ISOMORPHIC: Native modules (iOS/Android) emit events with binary data that
 * Expo SDK 54 automatically converts to Uint8Array
 */
export interface DecryptedChunkEvent {
  data: Uint8Array; // Binary PCM audio data (Data/ByteArray → Uint8Array)
  index: number; // Chunk number (0-based)
  isLast: boolean; // True if this is the final chunk
}

export interface RecordingStatus {
  state: RecorderState;
  sessionId: string | null;
  filePath: string | null;
  reason?: StopReason;
}

// Lazy load the native module to handle cases where it's not available
let SecureRecorderModuleInstance: any = null;

function getSecureRecorderModule() {
  if (SecureRecorderModuleInstance === null) {
    // Try optional first to get better error info
    SecureRecorderModuleInstance = requireOptionalNativeModule('SecureRecorder');
    if (!SecureRecorderModuleInstance) {
      console.error('Failed to load SecureRecorder native module: Module not found in registry');
      console.error('Available modules:', Object.keys(globalThis.expo?.modules || {}));
      throw new Error(
        'SecureRecorder native module is not available. Make sure the app has been fully restarted (not just reloaded) after adding the module.'
      );
    }
  }
  return SecureRecorderModuleInstance;
}

type SecureRecorderModuleType = {
  // Recording
  startRecording(sessionId: string): Promise<string>;
  stopRecording(): Promise<string>;
  getStatus(): Promise<RecordingStatus>;
  
  // Permissions
  hasPermission(): Promise<boolean>;
  
  // Streaming Decryption
  /**
   * Stream decrypt encrypted audio file, emitting events for each chunk
   * 
   * MEMORY SAFE: Uses true streaming to read chunks incrementally from disk.
   * Emits "onAudioChunkDecrypted" event for each decrypted chunk immediately,
   * then discards the data to prevent OOM on large files.
   * 
   * @returns Promise that resolves when decryption starts (events are emitted asynchronously)
   * 
   * @example
   * SecureRecorder.addListener('onAudioChunkDecrypted', (chunk: DecryptedChunkEvent) => {
   *   const pcmData = chunk.data; // Already Uint8Array!
   *   await onnxSession.processChunk(pcmData);
   * });
   * 
   * await SecureRecorder.stream(encryptedPath);
   */
  stream(encryptedPath: string): Promise<void>;
  
  // EventEmitter methods (native module is already an EventEmitter)
  addListener(event: string, listener: (data: any) => any): { remove: () => void };
  removeAllListeners(event?: string): void;
};

const SecureRecorderModule = new Proxy({} as SecureRecorderModuleType, {
  get(_target, prop) {
    const module = getSecureRecorderModule();
    return module[prop as keyof typeof module];
  }
}) as SecureRecorderModuleType;

export const SecureRecorderEventEmitter = SecureRecorderModule;

/**
 * Event name constant for decrypted audio chunks
 */
export const EVENT_AUDIO_CHUNK_DECRYPTED = "onAudioChunkDecrypted";

export default SecureRecorderModule;
