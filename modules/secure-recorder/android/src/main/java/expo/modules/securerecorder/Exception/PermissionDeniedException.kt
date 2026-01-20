package expo.modules.securerecorder.exception

/**
 * Exception thrown when microphone permission is denied
 * 
 * ISOMORPHIC: Matches iOS SecureRecorderError.permissionDenied
 * - Both: code = "PERMISSION_DENIED"
 */
class PermissionDeniedException : SecureRecorderException(
  message = "Microphone permission not granted",
  code = "PERMISSION_DENIED"
)
