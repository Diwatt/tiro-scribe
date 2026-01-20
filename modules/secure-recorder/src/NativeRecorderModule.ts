import type { RecordingStatus } from './SecureRecorderModule';

/**
 * Interface for native recorder module operations.
 * Enables dependency inversion and testability.
 */
export interface NativeRecorderModule {
  startRecording(sessionId: string): Promise<string>;
  stopRecording(): Promise<string>;
  getStatus(): Promise<RecordingStatus>;
  hasPermission(): Promise<boolean>;
  stream(encryptedPath: string): Promise<void>;
  addListener(event: string, listener: (data: any) => any): { remove: () => void };
}

/**
 * Interface for event emitter operations.
 * Enables dependency inversion and testability.
 */
export interface EventEmitter {
  addListener(event: string, listener: (data: any) => any): { remove: () => void };
}
