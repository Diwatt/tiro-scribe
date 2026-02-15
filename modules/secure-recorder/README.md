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

### Basic Recording

```typescript
import { SecureRecorder } from 'secure-recorder';

// Check permission (static utility)
const hasPermission = await SecureRecorder.hasPermission();
if (!hasPermission) {
  const granted = await SecureRecorder.requestPermission();
  if (!granted) {
    // Handle permission denied
    return;
  }
}

// Create recorder instance
const recorder = new SecureRecorder('session-123');
recorder.onerror = (error) => console.error('Recording error:', error);

// Start recording (state and filePath are updated optimistically on success)
await recorder.start();
// recorder.state === 'recording'
// recorder.isRecording === true
// recorder.filePath === '/path/to/session-123.dat'

// ... recording in progress ...

// Stop recording
const encryptedFilePath = await recorder.stop();
// recorder.state === 'stopped'
// recorder.isRecording === false
```

### Decryption & Model Integration

```typescript
import { SecureRecorder } from 'secure-recorder';

// Get decrypted audio chunks
const chunks = await SecureRecorder.getChunks(encryptedFilePath);

// For full-audio models (Whisper, Speaker Recognition)
const fullAudio = chunks.toUint8Array(); // Uint8Array
const transcript = await whisperModel.transcribe(fullAudio);

// For streaming models (Sherpa-ONNX)
for (const chunk of chunks) {
  const pcm = chunk.pcm; // Uint8Array
  recognizer.acceptWaveform(pcm, 16000);
}
```

**See "Model Integration" section below for detailed integration examples with Whisper, Sherpa-ONNX, and custom processing.**

## API

### Instance Methods

#### `new SecureRecorder(sessionId: string)`

Creates a new recorder instance.

- **sessionId**: Unique identifier for the recording session. File will be named `{sessionId}.dat`
- **Throws**: `SecureRecorderError` if sessionId is empty or whitespace

#### `start(): Promise<void>`

Starts recording with streaming encryption.

- **Throws**: `SecureRecorderError` if recording fails, permission is denied, or already recording

#### `stop(): Promise<string | null>`

Stops the current recording and returns the absolute path to the encrypted file. State and `filePath` are updated optimistically on success.

**Idempotent**: safe to call when already stopped or never started. In those cases a warning is logged and a value is returned without throwing.

- **Returns**: Absolute path to the encrypted file, or `null` when there was nothing to stop (never started, or already stopped with no path). When already stopped, returns the existing `filePath`.
- **Throws**: `SecureRecorderError` only when the native stop fails while a recording was active.

### Instance Properties

#### `state: RecorderState` (readonly)

Current recording state: `'inactive' | 'recording' | 'stopped'`

#### `isRecording: boolean` (readonly)

Whether a recording is currently active. Computed from `state`.

#### `sessionId: string | null` (readonly)

Current session ID, or `null` if not set.

#### `filePath: string | null` (readonly)

Path to the encrypted recording file, or `null` if not recording/stopped.

### Optional callback

#### `onerror: ((error: SecureRecorderError) => void) | null`

Called when a command (`start` or `stop`) throws. Not an event subscription.

```typescript
recorder.onerror = (error) => {
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
};
```

### Static Methods

#### `SecureRecorder.hasPermission(): Promise<boolean>`

Checks if microphone permission is granted.

#### `SecureRecorder.requestPermission(): Promise<boolean>`

Requests microphone permission from the user. Uses expo-audio internally.

- **Returns**: `true` if permission granted, `false` if denied
- **Throws**: `SecureRecorderError` if permission request fails

#### `SecureRecorder.getChunks(encryptedPath: string): Promise<AudioChunkCollection>`

Get decrypted audio chunks from encrypted file. See "Model Integration" section below for usage examples.

## File Format

The encrypted file format:
- **Android**: `[12-byte IV][encrypted audio data][16-byte GCM tag]`
- **iOS**: `[12-byte nonce][encrypted audio data][16-byte GCM tag]`

## Reference architecture (mandatory for AI)

This module implements the **sensor** part of the app reference architecture. Its output is contract-bound so downstream AI (VAD, ASR, CREPE, CAM++) can assume a single, fixed format.

**Canonical spec:** `docs/app_design_architecture.md` (project root). Any change to format or limits must stay aligned with that doc.

**Contract (decrypted output):**

| Requirement | Value | Enforced in |
|-------------|--------|-------------|
| Sample rate | 16 000 Hz | `AudioConfig` (iOS/Android) |
| Format | PCM 16-bit mono | `AudioConfig` |
| Capture | UNPROCESSED (Android) / `.measurement` (iOS) | `AudioRecorder` |
| Max duration | 4 hours | `LimitRegistry` |
| Max file size | 500 MB | `LimitRegistry` |

Do not add AGC, noise suppression, or resampling to other rates in this module; the architecture assumes raw, clinical-grade input for all models.

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

## Development

### Development Commands

**Validate module:**
```bash
pnpm validate            # Check required files exist
```

**Verify & build:**
```bash
pnpm verify:android      # Compile Kotlin + run 51 tests
pnpm verify:ios          # Compile Swift + run 58 tests
pnpm build:android       # Build Android module
pnpm build:ios           # Build iOS module
```

**Run tests:**
```bash
pnpm test:android        # Android unit tests (51)
pnpm test:ios            # iOS unit tests (58)
pnpm test:unit           # Both platforms
pnpm test:integration    # TypeScript API test (device/simulator only)
```

> **Note**: 
> - `test:integration` requires a real device or simulator (not included in CI)
> - iOS tests use the first available iPhone simulator in CI
> - For local testing, tests will use whatever simulator is available

### Integration Testing

**Run on device/simulator:**
```bash
npx expo prebuild
npx expo run:android  # or run:ios
```

**Test in your app:**
```typescript
import { SecureRecorder } from 'secure-recorder';

// Check & request permission
const hasPermission = await SecureRecorder.hasPermission();
if (!hasPermission) {
  const granted = await SecureRecorder.requestPermission();
}

// Create recorder instance
const recorder = new SecureRecorder('session-id');

// Start recording
await recorder.start();

// Stop recording
const encryptedPath = await recorder.stop();
```

See [`__tests__/integration.test.ts`](./__tests__/integration.test.ts) for test scenarios.

### Test Coverage

**Android (Kotlin)**: Tests across 5 test files
- `KeyManagerTest.kt`
- `EncryptionStreamTest.kt`
- `AudioConfigTest.kt`
- `RecordingStateTest.kt`
- `AudioRecorderTest.kt`

**iOS (Swift)**: Tests across 5 test files
- `KeyManagerTests.swift`
- `EncryptionStreamTests.swift`
- `AudioConfigTests.swift`
- `RecordingStateTests.swift`
- `AudioRecorderTests.swift`

All test suites follow **isomorphic design**: Each Android test has a matching iOS test that verifies identical behavior.

---

## Model Integration

### Chunked Encryption ↔ Full-Audio Models

**The Challenge**: CryptoKit/Security APIs force chunked encryption (each audio buffer encrypted independently), but Whisper and some Sherpa models require full audio context.

**The Solution**: Separate encryption chunks from inference chunks:
- **Encryption Layer**: Small chunks (~4KB) for security
- **Decryption Layer**: Reassemble in RAM (no disk write)
- **Inference Layer**: Deliver audio in required format

### Integration Patterns

#### 1. Whisper (Full Audio Required)

```typescript
import { SecureRecorder } from 'secure-recorder';

// Get all chunks
const chunks = await SecureRecorder.getChunks(encryptedPath);

// Merge into single Uint8Array
const fullAudio = chunks.toUint8Array(); // ~460MB for 4-hour recording

// Pass to Whisper
const transcript = await whisperModel.transcribe(fullAudio);
```

**Memory Impact** (4-hour recording):
- Encrypted file: ~485MB (disk)
- Decrypted audio: ~460MB (RAM during inference)
- Peak RAM: ~945MB ✅ Acceptable

---

#### 2. Sherpa Speaker Recognition (Full Audio Required)

```typescript
import { SecureRecorder } from 'secure-recorder';

// Get and merge chunks
const chunks = await SecureRecorder.getChunks(encryptedPath);
const fullAudio = chunks.toUint8Array();

// Extract speaker embedding
const speakerVector = await sherpaModel.extractSpeaker(fullAudio);

// Compare with known speakers
const similarity = cosineSimilarity(speakerVector, knownSpeaker);
```

---

#### 3. Sherpa Streaming ASR (Chunk-by-Chunk)

```typescript
import { SecureRecorder } from 'secure-recorder';
import { createStreamingRecognizer } from 'sherpa-onnx-react-native';

// Get chunks (doesn't load all into RAM yet)
const chunks = await SecureRecorder.getChunks(encryptedPath);

// Create streaming recognizer
const recognizer = await createStreamingRecognizer(modelConfig);

// Process each chunk sequentially
for (const chunk of chunks) {
  const pcm = chunk.pcm; // Uint8Array
  recognizer.acceptWaveform(pcm, 16000);
  
  // Get partial results while processing
  const partialResult = recognizer.getResult();
  console.log('Partial:', partialResult);
}

// Finalize
recognizer.inputFinished();
const finalTranscript = recognizer.getResult();
```

**Benefit**: Lower peak memory (only one chunk in RAM at a time).

---

#### 4. Custom Processing

```typescript
import { SecureRecorder, AudioChunk } from 'secure-recorder';

// Get chunks
const chunks = await SecureRecorder.getChunks(encryptedPath);

// Process with custom logic (sequential async processing)
for (const chunk of chunks) {
  const pcm = chunk.pcm; // Uint8Array
  
  // Custom processing
  const features = extractFeatures(pcm);
  await saveToDatabase(index, features);
  
  console.log(`Processed chunk ${index + 1}/${chunks.length}`);
});

// Or use collection methods
const chunkSizes = chunks.map(chunk => chunk.size);
const totalSize = chunks.getTotalSize();
const duration = chunks.getDuration(); // seconds
```

---

### Audio Format

All decrypted audio is:
- **Format**: 16-bit PCM (signed integers)
- **Sample Rate**: 16000 Hz
- **Channels**: Mono (1 channel)
- **Byte Order**: Little-endian
- **Type**: `Uint8Array` (binary data)

To convert to Float32Array (required by some models):

```typescript
function pcmToFloat32(pcm: Uint8Array): Float32Array {
  const int16 = new Int16Array(
    pcm.buffer,
    pcm.byteOffset,
    pcm.byteLength / 2
  );
  
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0; // Normalize to [-1, 1]
  }
  
  return float32;
}

// Usage
const pcm = chunk.pcm;
const floatAudio = pcmToFloat32(pcm);
```

---

### Security Considerations

#### Recording Limits

The module enforces:
- **Max Duration**: 4 hours
- **Max File Size**: 500MB

**Why?** To ensure decrypted audio always fits in RAM for full-audio models.

#### No Disk Writes

Decryption happens **entirely in RAM**:
1. ✅ Read encrypted file
2. ✅ Decrypt chunks in memory
3. ✅ Return `Uint8Array` to JavaScript
4. ❌ Never write unencrypted data to disk

#### Memory Safety

For streaming models (Sherpa ASR):
```typescript
// ✅ Good: Process one chunk at a time
for (const chunk of chunks) {
  const pcm = chunk.pcm;
  recognizer.acceptWaveform(pcm, 16000);
  // chunk automatically garbage collected after loop iteration
}

// ❌ Bad: Load all chunks into array
const allChunks = chunks.toUint8Arrays(); // Holds all in RAM!
```

For full-audio models (Whisper):
```typescript
// ✅ Acceptable: One-time merge for full context
const fullAudio = chunks.toUint8Array();
const transcript = await whisper.transcribe(fullAudio);
// fullAudio garbage collected after transcription
```

---

### Collection API Reference

The `AudioChunkCollection` provides:

**Access**
```typescript
chunks.length          // Number of chunks
chunks.at(index)       // Get chunk at index
chunks.dataAt(index)   // Get Uint8Array at index
```

**Merging**
```typescript
chunks.toUint8Array()       // Single Uint8Array (full audio)
chunks.toUint8Arrays()  // Array of Uint8Array (per chunk)
```

**Iteration**
```typescript
chunks.forEach((chunk, i) => { ... })
for (const chunk of chunks) { ... }
// For async processing:
for (const chunk of chunks) {
  await processChunkAsync(chunk.pcm);
}
```

**Transformation**
```typescript
chunks.map(chunk => chunk.size)
chunks.filter(chunk => chunk.size > 1000)
chunks.slice(0, 10)  // First 10 chunks
```

**Metadata**
```typescript
chunks.getTotalSize()           // Total bytes
chunks.getDuration()            // Duration in seconds
chunks.getDuration(16000, 2)    // Custom sample rate/bytes
```

---

### Performance Tips

1. **For Whisper**: Use `toUint8Array()` (single allocation, faster than concatenating)
2. **For Sherpa Streaming**: Iterate directly over chunks (lowest memory)
3. **For Custom Processing**: Use `for...of` with `await` for sequential async processing
4. **Avoid**: Calling `toUint8Arrays()` unless you need all chunks in memory
