// Public API types
export type { SecureRecorderError } from './Type';
export { ErrorCode } from './ErrorCode';
export { RecorderState } from './RecorderState';
export { StopReason } from './StopReason';
export type { RecordingStatus } from './SecureRecorderModule';
export type { DecryptedChunkEvent } from './SecureRecorderModule';

// Public API classes
export { SecureRecorder } from './SecureRecorder';

// Default export (for backward compatibility)
export { SecureRecorder as default } from './SecureRecorder';
