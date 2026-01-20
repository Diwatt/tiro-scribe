package expo.modules.securerecorder.exception

/**
 * Exception thrown when attempting to stop recording when no recording is in progress
 * 
 * ISOMORPHIC: Matches iOS SecureRecorderError.noRecordingInProgress
 * - Both: code = "NO_RECORDING_IN_PROGRESS"
 */
class NoRecordingException : SecureRecorderException(
  message = "No recording in progress",
  code = "NO_RECORDING_IN_PROGRESS"
)
