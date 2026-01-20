import Foundation
import AVFoundation

/**
 * Permission management protocol
 */
protocol PermissionManager {
  func has() -> Bool
  func request() async -> Bool
}

/**
 * iOS/iPadOS permission manager implementation
 * Platform differences handled via build configuration
 */
class IOSPermissionManager: PermissionManager {
  func has() -> Bool {
    return AVAudioSession.sharedInstance().recordPermission == .granted
  }
  
  func request() async -> Bool {
    return await withCheckedContinuation { continuation in
      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        continuation.resume(returning: granted)
      }
    }
  }
}
