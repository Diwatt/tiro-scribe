import Foundation
import AVFoundation

/**
 * Protocol for audio session operations (for testability)
 * 
 * Allows mocking AVAudioSession in unit tests to verify configuration calls
 * without requiring actual audio hardware or permissions.
 */
internal protocol AudioSessionProtocol {
  func setCategory(_ category: AVAudioSession.Category, mode: AVAudioSession.Mode, options: AVAudioSession.CategoryOptions) throws
  func setActive(_ active: Bool, options: AVAudioSession.SetActiveOptions) throws
}

extension AVAudioSession: AudioSessionProtocol {}
