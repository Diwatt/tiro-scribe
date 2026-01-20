package expo.modules.securerecorder

import java.io.File
import java.io.FileOutputStream

/**
 * Secure file shredding utility
 * 
 * Single Responsibility: Overwrite file with zeros and delete it to prevent forensic recovery.
 * 
 * SECURITY: Overwrites file contents with zeros before deletion to make forensic recovery
 * significantly more difficult. Uses chunked writing to avoid OOM on large files.
 */
class FileShredder {
  companion object {
    /**
     * Securely shred a file by overwriting with zeros and deleting it.
     * 
     * Process:
     * 1. Overwrite entire file with zeros (chunked to avoid OOM)
     * 2. Force flush to disk
     * 3. Delete the file
     * 
     * @param file File to shred
     * @throws Exception if file operations fail (caller should handle silently if needed)
     */
    fun shred(file: File) {
      if (!file.exists()) {
        return // File doesn't exist, nothing to shred
      }
      
      val fileSize = file.length()
      if (fileSize > 0) {
        val chunkSize = 1024 * 1024L // 1MB
        val zeros = ByteArray(chunkSize.toInt())
        var bytesWritten = 0L
        
        FileOutputStream(file).use { outputStream ->
          while (bytesWritten < fileSize) {
            val remaining = fileSize - bytesWritten
            val toWrite = minOf(chunkSize, remaining).toInt()
            
            if (toWrite < chunkSize) {
              // Last chunk is smaller, write only what's needed
              outputStream.write(ByteArray(toWrite))
            } else {
              outputStream.write(zeros)
            }
            bytesWritten += toWrite
          }
          outputStream.flush()
          
          // Force flush to disk (sync file descriptor)
          try {
            outputStream.fd.sync()
          } catch (e: Exception) {
            // Ignore sync errors (not available on all systems)
          }
        }
      }
      
      // Delete the file
      file.delete()
    }
  }
}
