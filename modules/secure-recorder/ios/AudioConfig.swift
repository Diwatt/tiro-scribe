import Foundation
import AVFoundation

/**
 * Audio configuration for iOS/iPadOS
 * 
 * Defines audio recording parameters: 16kHz sample rate, mono channel, 16-bit PCM format.
 * Calculates buffer size and provides AVAudioFormat creation for recording setup.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - sampleRate = 16000.0 (Double, required for AVAudioFormat)
 * - bufferSize calculated as sampleRate * 0.01 (10ms buffer, ~160 frames)
 * - Provides createFormat() method for AVAudioFormat creation
 * 
 * NOTE: 16kHz is optimal for voice recognition models (Whisper, Sherpa-ONNX)
 */
class AudioConfig {
  // Internal properties
  internal let sampleRate: Double = 16000.0
  internal let channelCount: Int = 1
  internal let bitDepth: Int = 16
  
  internal lazy var bufferSize: Int = {
    // Calculate reasonable buffer size for 16kHz audio
    // Target: ~10ms buffer (160 frames at 16kHz)
    // Android uses AudioRecord.getMinBufferSize() * 2, iOS uses fixed calculation
    let targetFrames = Int(sampleRate * 0.01) // 10ms = 160 frames at 16kHz
    let minFrames = 256 // Minimum reasonable buffer
    return max(targetFrames, minFrames)
  }()
  
  // Internal methods
  /**
   * Create AVAudioFormat for recording
   * 
   * Creates and returns an AVAudioFormat configured for 16kHz mono 16-bit PCM recording.
   * 
   * @return AVAudioFormat configured for 16kHz mono 16-bit PCM, or nil if format creation fails
   */
  internal func createFormat() -> AVAudioFormat? {
    return AVAudioFormat(
      commonFormat: .pcmFormatInt16,
      sampleRate: sampleRate,
      channels: AVAudioChannelCount(channelCount),
      interleaved: true
    )
  }
}
