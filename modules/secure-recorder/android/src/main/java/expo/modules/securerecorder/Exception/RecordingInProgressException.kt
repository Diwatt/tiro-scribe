package expo.modules.securerecorder.exception

/**
 * Exception thrown when attempting to start recording while already recording
 * 
 * ISOMORPHIC: Matches iOS SecureRecorderError.recordingInProgress
 * - Both: code = "RECORDING_IN_PROGRESS"
 */
class RecordingInProgressException : SecureRecorderException(
  message = "Recording already in progress",
  code = "RECORDING_IN_PROGRESS"
)
