import Foundation
import AVFoundation

/**
 * Audio recorder protocol
 */
protocol AudioRecorder {
  func start() throws -> (engine: AVAudioEngine, inputNode: AVAudioInputNode, format: AVAudioFormat)
  func stop(engine: AVAudioEngine, inputNode: AVAudioInputNode)
  func installTap(
    on inputNode: AVAudioInputNode,
    bufferSize: AVAudioFrameCount,
    format: AVAudioFormat,
    block: @escaping (AVAudioPCMBuffer, AVAudioTime) -> Void
  )
}

/**
 * AVAudioEngine implementation of AudioRecorder
 */
class AVAudioEngineRecorder: AudioRecorder {
  func start() throws -> (engine: AVAudioEngine, inputNode: AVAudioInputNode, format: AVAudioFormat) {
    let audioEngine = AVAudioEngine()
    let inputNode = audioEngine.inputNode
    let inputFormat = inputNode.outputFormat(forBus: 0)
    
    audioEngine.prepare()
    try audioEngine.start()
    
    return (audioEngine, inputNode, inputFormat)
  }
  
  func stop(engine: AVAudioEngine, inputNode: AVAudioInputNode) {
    engine.stop()
    inputNode.removeTap(onBus: 0)
  }
  
  func installTap(
    on inputNode: AVAudioInputNode,
    bufferSize: AVAudioFrameCount,
    format: AVAudioFormat,
    block: @escaping (AVAudioPCMBuffer, AVAudioTime) -> Void
  ) {
    inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: format, block: block)
  }
}
