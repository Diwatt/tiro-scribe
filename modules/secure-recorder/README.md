# Secure Recorder

Expo native module for secure audio recording with streaming AES-256-GCM encryption.

## Features

- **Streaming Encryption**: Audio data is encrypted in real-time before being written to disk
- **Zero-Trust Architecture**: No unencrypted temporary files are ever stored
- **Hardware-Backed Keys**: 
  - Android: Uses AndroidKeyStore with `setUnlockedDeviceRequired(true)`
  - iOS: Uses Keychain with `kSecAttrAccessibleAfterFirstUnlock`
- **Background Support**: Keys remain accessible after device unlock for background processing

## Installation

This is a local Expo module. Add it to your `app.json` plugins:

```json
{
  "expo": {
    "plugins": [
      "./modules/secure-recorder"
    ]
  }
}
```

## Usage

```typescript
import SecureRecorder from 'secure-recorder';

// Check permission
const hasPermission = await SecureRecorder.hasPermission();
if (!hasPermission) {
  const granted = await SecureRecorder.requestPermission();
  if (!granted) {
    // Handle permission denied
    return;
  }
}

// Start recording
const sessionId = 'session-123';
const filePath = await SecureRecorder.startRecording(sessionId);

// ... recording in progress ...

// Stop recording
const encryptedFilePath = await SecureRecorder.stopRecording();
```

## API

### `startRecording(sessionId: string): Promise<string>`

Starts recording with streaming encryption. Returns the absolute path to the encrypted file.

- **sessionId**: Unique identifier for the recording session. File will be named `{sessionId}.dat`

### `stopRecording(): Promise<string>`

Stops the current recording and returns the absolute path to the encrypted file.

### `getStatus(): Promise<RecordingStatus>`

Returns the current recording status:
```typescript
{
  isRecording: boolean;
  sessionId: string | null;
  filePath: string | null;
}
```

### `hasPermission(): Promise<boolean>`

Checks if microphone permission is granted.

### `requestPermission(): Promise<boolean>`

Requests microphone permission from the user.

## File Format

The encrypted file format:
- **Android**: `[12-byte IV][encrypted audio data][16-byte GCM tag]`
- **iOS**: `[12-byte nonce][encrypted audio data][16-byte GCM tag]`

## Security

- **Encryption**: AES-256-GCM
- **Key Storage**: 
  - Android: AndroidKeyStore (hardware-backed when available)
  - iOS: Keychain (Secure Enclave when available)
- **Key Accessibility**: Keys are accessible after first device unlock (crucial for background processing)

## Error Handling

All methods throw `SecureRecorderError` objects:

```typescript
interface SecureRecorderError {
  code: string;
  message: string;
  details?: unknown;
}
```

Common error codes:
- `INVALID_SESSION_ID`: Session ID is empty
- `RECORDING_IN_PROGRESS`: Attempted to start recording while already recording
- `NO_RECORDING_IN_PROGRESS`: Attempted to stop recording when none is active
- `PERMISSION_DENIED`: Microphone permission not granted
- `RECORDING_FAILED`: Failed to start recording
- `STOP_FAILED`: Failed to stop recording
- `KEYCHAIN_ERROR`: Keychain/key store operation failed
