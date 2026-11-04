import Foundation
import AVFoundation

/**
 * Protocol for audio engine operations (for testability)
 *
 * Allows mocking AVAudioEngine in unit tests to verify engine lifecycle calls
 * without requiring actual audio hardware. The input node is exposed through
 * AudioInputNodeProtocol because AVAudioInputNode cannot be subclassed.
 */
internal protocol AudioEngineProtocol {
  var audioInputNode: AudioInputNodeProtocol { get }
  var isRunning: Bool { get }
  func prepare()
  func start() throws
  func stop()
}

extension AVAudioEngine: AudioEngineProtocol {
  internal var audioInputNode: AudioInputNodeProtocol { inputNode }
}
