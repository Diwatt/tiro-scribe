import Foundation

/**
 * Protocol for encryption stream operations (for testability)
 * 
 * Allows mocking EncryptionStream in tests without requiring real file I/O
 */
internal protocol EncryptionStreamProtocol {
  func initialize() throws
  func write(data: Data) throws
  func close()
}

extension EncryptionStream: EncryptionStreamProtocol {}
