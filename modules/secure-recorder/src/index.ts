// Public API types

export { ErrorCode } from './ErrorCode';
export { RecorderState } from './RecorderState';
// Public API classes
// Default export (for backward compatibility)
export { SecureRecorder, SecureRecorder as default } from './SecureRecorder';
export type { DecryptedChunkEvent, RecordingStatus } from './SecureRecorderModule';
export { StopReason } from './StopReason';
export type { SecureRecorderError } from './Type';
