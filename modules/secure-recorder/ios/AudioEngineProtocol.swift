import Foundation
import AVFoundation

/**
 * Protocol for audio engine operations (for testability)
 * 
 * Allows mocking AVAudioEngine in unit tests to verify engine lifecycle calls
 * without requiring actual audio hardware.
 */
internal protocol AudioEngineProtocol {
  var inputNode: AVAudioInputNode { get }
  func prepare()
}

extension AVAudioEngine: AudioEngineProtocol {}
