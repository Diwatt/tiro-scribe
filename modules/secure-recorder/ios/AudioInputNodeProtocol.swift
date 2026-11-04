import Foundation
import AVFoundation

/**
 * Protocol for audio input node operations (for testability)
 *
 * Allows mocking AVAudioInputNode in unit tests: AVAudioInputNode cannot be
 * subclassed (its initializer is unavailable), so AudioRecord depends on this
 * protocol instead and the mock reimplements format + tap handling.
 */
internal protocol AudioInputNodeProtocol {
  func inputFormat(forBus bus: AVAudioNodeBus) -> AVAudioFormat
  func installTap(onBus bus: AVAudioNodeBus, bufferSize: AVAudioFrameCount, format: AVAudioFormat?, block tapBlock: @escaping AVAudioNodeTapBlock)
  func removeTap(onBus bus: AVAudioNodeBus)
}

extension AVAudioInputNode: AudioInputNodeProtocol {}
