// Public API types

export { DecryptedStreamReader } from './DecryptedStreamReader';
export { ErrorCode } from './ErrorCode';
export { RecorderState } from './RecorderState';
// Public API classes
// Default export (for backward compatibility)
export { SecureRecorder, SecureRecorder as default } from './SecureRecorder';
export type { DecryptedChunk, RecordingStatus } from './SecureRecorderModule';
export { StopReason } from './StopReason';
export type { SecureRecorderError } from './Type';
