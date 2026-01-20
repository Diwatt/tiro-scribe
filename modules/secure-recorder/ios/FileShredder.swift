import Foundation

/**
 * Secure file shredding utility
 * 
 * Single Responsibility: Overwrite file with zeros and delete it to prevent forensic recovery.
 * 
 * SECURITY: Overwrites file contents with zeros before deletion to make forensic recovery
 * significantly more difficult. Uses chunked writing to avoid OOM on large files.
 */
public class FileShredder {
  /**
   * Securely shred a file by overwriting with zeros and deleting it.
   * 
   * Process:
   * 1. Overwrite entire file with zeros (chunked to avoid OOM)
   * 2. Force flush to disk
   * 3. Delete the file
   * 
   * @param fileURL URL of the file to shred
   * @throws Error if file operations fail (caller should handle silently if needed)
   */
  public static func shred(fileURL: URL) throws {
    guard FileManager.default.fileExists(atPath: fileURL.path) else {
      return // File doesn't exist, nothing to shred
    }
    
    // 1. Overwrite with Zeros to prevent forensic recovery
    guard let fileHandle = try? FileHandle(forWritingTo: fileURL) else {
      // If we can't open for writing, try to delete anyway
      try? FileManager.default.removeItem(at: fileURL)
      return
    }
    
    defer {
      try? fileHandle.close()
    }
    
    let fileSize = (try? FileManager.default.attributesOfItem(atPath: fileURL.path)[.size] as? UInt64) ?? 0
    guard fileSize > 0 else {
      // Empty file, just delete it
      try? FileManager.default.removeItem(at: fileURL)
      return
    }
    
    // Write zeros in chunks to avoid OOM on large files
    let chunkSize = 1024 * 1024 // 1MB
    let zeros = Data(count: chunkSize)
    var bytesWritten: UInt64 = 0
    
    while bytesWritten < fileSize {
      let remaining = fileSize - bytesWritten
      let toWrite = min(UInt64(chunkSize), remaining)
      
      // If last chunk is smaller, create specific data
      if toWrite < chunkSize {
        fileHandle.write(Data(count: Int(toWrite)))
      } else {
        fileHandle.write(zeros)
      }
      bytesWritten += toWrite
    }
    
    // Force flush to disk
    try? fileHandle.synchronize()
    
    // 2. Delete the file
    try FileManager.default.removeItem(at: fileURL)
  }
}
