# Secure Recorder Module - iOS/Android Implementation Alignment

This document outlines the alignment between iOS and Android implementations to ensure consistency across platforms.

## ✅ Aligned Features

### 1. **Error Handling**
Both platforms now use consistent error types:
- `recordingInProgress` / `RecordingInProgressException`
- `permissionDenied` / `PermissionDeniedException`
- `noRecordingInProgress` / `NoRecordingException`
- `initializationFailed` / `InitializationException`
- `recordingFailed` / (wrapped in InitializationException)
- `stopFailed` / (wrapped in InitializationException)
- `keychainError` / `KeyStoreException`

### 2. **Encryption Stream Management**
Both platforms follow the same pattern:
- `initialize()` - Sets up encryption and writes IV/nonce
- `write()` - Encrypts and writes data chunks
- `finalize()` - Finalizes encryption and writes GCM authentication tag
- `close()` - Closes file handles and releases resources

**Android**: `CipherOutputStream.close()` automatically finalizes GCM tag, but we explicitly call `finalize()` for clarity and consistency.

### 3. **File Storage Location**
Both platforms use app-private directories:
- **Android**: `context.filesDir` (app's private files directory)
- **iOS**: `applicationSupportDirectory` (app's private support directory)

Both are private to the app and not accessible by other apps or users.

### 4. **State Management**
Both use immutable state objects:
- **Android**: `RecordingState` data class with `IDLE` companion
- **iOS**: `RecordingState` struct with `.idle` static property

Both are thread-safe:
- **Android**: `@Volatile` + `synchronized` blocks
- **iOS**: `DispatchQueue` for thread-safe access

### 5. **API Consistency**
Both platforms expose identical APIs:
- `startRecording(sessionId: String) -> String`
- `stopRecording() -> String`
- `getStatus() -> RecordingStatus`
- `hasPermission() -> Boolean`
- `requestPermission() -> Boolean`

### 6. **Dependency Injection**
Both use protocol/interface-based dependencies:
- `KeyManager` / `KeyManager` protocol
- `PermissionManager` / `PermissionManager` protocol
- `AudioRecorder` / `AudioRecorder` protocol
- `EncryptionStreamManager` (concrete class, same interface)

### 7. **Recording Flow**
Both follow identical flow:
1. Validate session ID
2. Check if already recording (thread-safe)
3. Check permission
4. Get/create encryption key
5. Create encrypted file in private directory
6. Initialize encryption stream
7. Start audio recording
8. Update state
9. Process audio buffers → encrypt → write
10. On stop: finalize encryption → close stream → reset state

## 🔄 Platform-Specific Differences (By Design)

### Audio Recording
- **Android**: Uses `AudioRecord` with background thread for reading
- **iOS**: Uses `AVAudioEngine` with tap callback for buffer processing

These are platform-specific APIs but provide equivalent functionality.

### Key Storage
- **Android**: AndroidKeyStore with `setUnlockedDeviceRequired(true)`
- **iOS**: Keychain with `kSecAttrAccessibleAfterFirstUnlock`

Both provide hardware-backed security with background access capability.

### Threading
- **Android**: Kotlin Coroutines with `Dispatchers.IO`
- **iOS**: Swift async/await with `DispatchQueue` for state synchronization

Both ensure thread-safe operations.

## 📋 Implementation Checklist

- [x] Error types aligned
- [x] Encryption stream API aligned (initialize/write/finalize/close)
- [x] File storage location aligned (private directories)
- [x] State management aligned (immutable, thread-safe)
- [x] API signatures aligned
- [x] Recording flow aligned
- [x] Dependency injection pattern aligned
- [x] Thread safety implemented on both platforms

## 🎯 Result

Both implementations now follow the same architectural patterns, error handling, and API contracts, ensuring consistent behavior across iOS and Android while respecting platform-specific best practices.
