/**
 * Error codes for SecureRecorder operations.
 * Type-safe enum for all possible error conditions.
 */
export enum ErrorCode {
    UnknownError = 'UnknownError',
    RecordingInProgress = 'RecordingInProgress',
    NoRecordingInProgress = 'NoRecordingInProgress',
    PermissionDenied = 'PermissionDenied',
    InitializationFailed = 'InitializationFailed',
    KeychainError = 'KeychainError',
    RecordingFailed = 'RecordingFailed',
    StopFailed = 'StopFailed',
    RecorderStopped = 'RecorderStopped',
    InvalidSessionId = 'InvalidSessionId',
    DecryptionFailed = 'DecryptionFailed',
    PermissionCheckFailed = 'PermissionCheckFailed',
    PermissionRequestFailed = 'PermissionRequestFailed',
}
