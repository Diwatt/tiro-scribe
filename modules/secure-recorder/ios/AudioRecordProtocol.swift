import Foundation

/**
 * Protocol for AudioRecord read operations (for testability)
 *
 * Allows mocking audio capture in Pipeline tests without requiring AVAudioEngine.
 * Minimal seam: only the pull-based read() the Pipeline consumes.
 */
internal protocol AudioRecordProtocol {
  func read(_ buffer: UnsafeMutablePointer<UInt8>, offset: Int, size: Int) -> Int
}

extension AudioRecord: AudioRecordProtocol {}
