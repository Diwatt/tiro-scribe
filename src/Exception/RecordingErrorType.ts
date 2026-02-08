/**
 * Recording error types
 * Enum for categorizing recording-related errors
 */
export enum RecordingErrorType {
    PermissionDenied = 'permission_denied',
    RecorderNotInitialized = 'recorder_not_initialized',
    NoActiveRecording = 'no_active_recording',
    RecordingUriUnavailable = 'recording_uri_unavailable',
    FileOperationFailed = 'file_operation_failed',
    RecordingFailed = 'recording_failed',
    PermissionRequestFailed = 'permission_request_failed',
}
