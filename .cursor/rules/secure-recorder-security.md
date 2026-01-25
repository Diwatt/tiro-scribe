---
description: "SecureRecorder security requirements - zero-trust medical audio encryption"
alwaysApply: true
---

# SecureRecorder: Zero-Trust Medical Audio Security

**Context**: High-security Expo Native Module for encrypted medical audio recording.

**Role**: Senior Mobile Security Architect and Kotlin/Swift Expert.

**Platform**: React Native with Expo (iOS + Android native modules)

**Required Dependencies**:
- `react-native-quick-base64` - For base64 decoding in React Native
- `onnxruntime-react-native` - For ONNX model inference

⚠️ **Important**: This is NOT a Node.js module. Use React Native APIs, not Node.js APIs (no `Buffer`, no `fs`, no `path`).

## CRITICAL SECURITY RULES (ZERO-TRUST)

All code MUST adhere to these strict security constraints. NO EXCEPTIONS.

### 1. NO UNENCRYPTED TEMP FILES

- Audio data flow: `Microphone → Encrypt Chunk → Disk`
- NEVER write raw PCM/WAV/AAC to disk before encryption
- All audio data must be encrypted immediately (no plaintext buffering)
- **Both platforms**: Each audio buffer chunk is encrypted independently with its own IV and written to disk
- **Chunked Encryption**: No plaintext accumulation in RAM, immediate write for crash resilience

### 2. ENCRYPTION CHUNKS vs INFERENCE PATTERNS

**IMPORTANT**: Chunked encryption (CryptoKit requirement) is separate from model inference patterns.

**Encryption Chunks** (CryptoKit/Security Layer):
- Small chunks (~4-8KB) encrypted independently with unique IVs
- File format: `[length][IV][data+tag][length][IV][data+tag]...`
- Reason: CryptoKit AES-GCM requires chunk-by-chunk encryption for streaming

**Inference Patterns** (Model Layer):
- **Whisper**: Requires full audio context (accumulate all chunks)
- **Sherpa Speaker Recognition**: Requires full audio (accumulate all chunks)
- **Sherpa Streaming ASR**: Can process sequentially (feed chunks with state)

**Solution**: Decrypt chunks → Reassemble in RAM → Pass to model
- ✅ Security maintained (no disk write of unencrypted data)
- ✅ Model compatibility (full audio or streaming as needed)
- ✅ Memory safe (4-hour limit ensures < 500MB)

### 3. MODEL COMPATIBILITY

**How Chunked Encryption Works with Different Model Types**

| Model Type | Decryption Pattern | Memory Usage | Example |
|------------|-------------------|--------------|---------|
| **Whisper ASR** | Decrypt all → Concat | ~945MB peak | `decryptAndConcatenate()` |
| **Sherpa Speaker** | Decrypt all → Concat | ~945MB peak | `decryptAndConcatenate()` |
| **Sherpa Streaming** | Decrypt all → Feed sequentially | ~585MB peak | `stream()` + loop |
| **Custom Processing** | Manual chunk control | Variable | `decodeChunk()` per chunk |

**Why This Works**:
1. **CryptoKit Constraint**: Forces chunked encryption (security requirement)
2. **Decryption Layer**: Reassembles chunks in RAM (no disk write)
3. **Model Layer**: Receives audio in required format (full or streaming)
4. **Memory Safety**: 4-hour/500MB limit ensures manageable RAM usage

**Peak Memory Analysis** (4-hour recording):
```
Encrypted file (disk):      ~485MB
Decrypted PCM (RAM):        ~460MB
Model workspace:            ~100MB (varies by model)
────────────────────────────────────
Total Peak RAM:             ~945MB ✅ Acceptable on modern devices
```

### 4. DECRYPTION FOR PROCESSING

**SECURITY: Decryption is ONLY for feeding audio to ONNX models**

**CRITICAL SECURITY BREACH PREVENTION**: Never write full unencrypted audio to disk

**Solution: Decrypt Chunks → Collection-Based Operations**

**KEY CONCEPT**: Chunked encryption (CryptoKit requirement) ≠ Model inference pattern

**SOLID Design**: `AudioChunkCollection` collection class encapsulates chunk operations

**React Native**: Use `react-native-quick-base64` for base64 decoding (not Node.js `Buffer`)

#### **Pattern 1: Full Audio Models** (Whisper, Sherpa Speaker Recognition)

```typescript
import { SecureRecorder } from '@/modules/secure-recorder';
import { decode } from 'react-native-quick-base64';

// Get chunks collection
const chunks = await SecureRecorder.getChunks(encryptedPath);

// Merge all chunks into single base64 string
const fullAudioBase64 = chunks.toBase64();

// Decode to Uint8Array (React Native)
const fullAudio = decode(fullAudioBase64);

// fullAudio is complete PCM in RAM (~460MB for 4-hour recording)
// Safe: Limited to 500MB max by recording constraints

// Pass to models requiring full context
const transcript = await whisperModel.transcribe(fullAudio);
const speakerVector = await sherpaModel.extractSpeaker(fullAudio);

// fullAudio automatically released when out of scope
```

#### **Pattern 2: Streaming Models** (Sherpa-ONNX Streaming ASR)

```typescript
import { SecureRecorder } from '@/modules/secure-recorder';
import { decode } from 'react-native-quick-base64';

// Get chunks collection
const chunks = await SecureRecorder.getChunks(encryptedPath);

// Create streaming recognizer
const recognizer = await createStreamingRecognizer(modelPath);

// Iterate over chunks (collection is iterable)
for (const chunk of chunks) {
  // Get base64 data from chunk
  const base64Data = chunk.getData();
  
  // Decode to Uint8Array (React Native)
  const pcmBuffer = decode(base64Data);
  
  // Feed to streaming model
  recognizer.acceptWaveform(pcmBuffer, 16000);
  
  // Get partial results in real-time
  const partialResult = recognizer.getResult();
  console.log('Partial:', partialResult.text);
}

// Finalize
recognizer.inputFinished();
const finalTranscript = recognizer.getResult();
```

#### **Pattern 3: Collection Methods** (Advanced)

```typescript
import { SecureRecorder } from '@/modules/secure-recorder';
import { decode } from 'react-native-quick-base64';

const chunks = await SecureRecorder.getChunks(encryptedPath);

// Get metadata
console.log(`Total chunks: ${chunks.length}`);
console.log(`Duration: ${chunks.getDuration()}s`);
console.log(`Size: ${chunks.getTotalSize()} bytes`);

// Process with async callback
await chunks.forEachAsync(async (chunk, index) => {
  const base64Data = chunk.getData();
  const pcm = decode(base64Data); // React Native
  await processChunkAsync(pcm);
  console.log(`Processed chunk ${index + 1}/${chunks.length}`);
});

// Slice operations
const firstMinute = chunks.slice(0, 60); // First 60 chunks
const firstMinuteAudio = firstMinute.toBase64();
const lastChunk = chunks.at(chunks.length - 1);

// Map/filter operations
const chunkSizes = chunks.map(c => c.data.length);
const largeChunks = chunks.filter(c => c.data.length > 1000);

// Get all chunks as base64 array
const base64Array = chunks.toBase64Array();
```

**Recording Duration/Size Limits**

To guarantee decrypted audio fits in memory for inference:

```typescript
// Maximum recording duration (configurable)
const MAX_RECORDING_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

// Audio format: 16kHz, mono, 16-bit PCM
// 1 hour = 115MB unencrypted (16000 * 2 * 3600)
// 4 hours = ~460MB unencrypted
// Encrypted + chunked = ~485MB (IV + GCM tag overhead)

// Memory Usage During Inference:
// Scenario 1: Whisper / Speaker Recognition (Full Audio)
//   - Encrypted file read: ~485MB
//   - Decrypted chunks concatenated: ~460MB
//   - Peak RAM: ~485MB + ~460MB = ~945MB (acceptable on modern devices)
//   - Released after inference completes

// Scenario 2: Sherpa Streaming ASR (Sequential Chunks)
//   - Encrypted file read: ~485MB
//   - Current chunk decoded: ~4-8KB
//   - Model state: ~50-100MB (depends on model)
//   - Peak RAM: ~485MB + 100MB = ~585MB (very manageable)
```

**Security Guarantees**:
- ✅ No disk write of unencrypted data (RAM-only decryption)
- ✅ No cleanup needed (no temp files)
- ✅ GCM authentication validated per chunk during decryption
- ✅ Crash-safe (no persistent unencrypted data)
- ✅ Recording limits ensure manageable file sizes (< 500MB)
- ✅ Decryption in controlled scope (released after inference)
- ✅ Full audio in RAM only during inference (limited by 4-hour/500MB constraint)

### 3. ENCRYPTION STANDARDS

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Padding**: NoPadding (handled by GCM)
- **Nonce/IV**: Must be unique and generated for every recording session (12 bytes for GCM)
- **Authentication Tag**: 16 bytes, appended at end of file

**File Format (Both Platforms - Chunked Sealed Boxes)**:
```
[Chunk1][Chunk2][Chunk3]...
Each Chunk: [4-byte length][12-byte IV][Encrypted Data + 16-byte GCM Tag]
```

**Chunk Structure**:
- **Length header (4 bytes)**: Size of (IV + encrypted data + tag) in bytes (Int32, big-endian)
- **IV (12 bytes)**: Unique random IV per chunk (GCM standard)
- **Encrypted data (variable)**: AES-256-GCM encrypted audio chunk
- **GCM Tag (16 bytes)**: Authentication tag for integrity verification

**Why Chunked?**
- No RAM accumulation (plaintext or ciphertext)
- Crash resilience (data written immediately)
- Cross-platform compatibility
- Each chunk has unique IV for cryptographic independence
- Length header enables efficient decryption without guessing chunk boundaries

### 4. KEY STORAGE (HARDWARE-BACKED)

Keys must be stored in hardware-backed secure storage and NEVER leave the secure environment.

**Android**:
- Use `AndroidKeyStore`
- Key must never leave the TEE (Trusted Execution Environment)
- Algorithm: `KeyProperties.KEY_ALGORITHM_AES`
- Block Mode: `KeyProperties.BLOCK_MODE_GCM`
- Key Size: 256 bits

**iOS**:
- Use Keychain (Secure Enclave when available)
- Service: `expo.modules.securerecorder`
- Generate using `SecRandomCopyBytes()`

### 5. KEY ACCESSIBILITY (BACKGROUND SUPPORT)

Recording must be processable in the background even if device is locked (after first unlock).

**Android**:
```kotlin
KeyGenParameterSpec.Builder(alias, PURPOSE_ENCRYPT or PURPOSE_DECRYPT)
  .setUserAuthenticationRequired(false)
  .setUnlockedDeviceRequired(true) // Accessible after first unlock
```

**iOS**:
```swift
kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlock
```

### 6. OS REQUIREMENTS

**Android**:
- `minSdkVersion = 28` (Android 9 Pie)
- Reason: Robust AndroidKeyStore implementation

**iOS**:
- Deployment Target: `13.0`
- Reason: Stable AVAudioEngine APIs

## IMPLEMENTATION GUIDELINES

### Android (Kotlin)

**Audio Capture**:
- Use `AudioRecord` for raw PCM (NOT `MediaRecorder`)
- Sample Rate: 16000 Hz (medical standard)
- Channel: `CHANNEL_IN_MONO`
- Encoding: `ENCODING_PCM_16BIT`

**Encryption**:
- Use `Cipher.getInstance("AES/GCM/NoPadding")` with **per-chunk encryption**
- Pattern: `initialize()` → `write()` (encrypt and write immediately) → `finalize()` (no-op)
- Each audio buffer chunk gets a new Cipher instance with unique IV
- Format per chunk: `[4-byte length] + [12-byte IV] + cipher.doFinal(chunk)` (includes 16-byte tag)
- Write to FileOutputStream immediately for crash resilience

**Decryption** (Streaming):
- Use `StreamDecryptionManager` class
- `stream()` method returns list of decrypted chunks
- Each chunk is base64-encoded for transport to JS
- No disk write - all decryption happens in memory
- Returns: `List<Map<String, Any>>` with keys: `data` (base64), `index`, `isLast`

**Permissions**:
- Runtime permission: `Manifest.permission.RECORD_AUDIO`
- Check before every recording session

**Concurrency**:
- Use Kotlin Coroutines with `Dispatchers.IO`
- Cancel-safe recording loops

### iOS (Swift)

**Audio Capture**:
- Use `AVAudioEngine` with `installTap` on input node
- Sample Rate: 16000 Hz
- Format: PCM 16-bit mono
- AVAudioSession Category: `.record`, Mode: `.measurement`

**Encryption**:
- Use `CryptoKit` AES-256-GCM with **per-chunk encryption**
- Pattern: `initialize()` → `write()` (encrypt and write immediately) → `finalize()` (no-op)
- Each audio buffer chunk is encrypted independently with `AES.GCM.seal()`
- Each sealed box has its own nonce (auto-generated by CryptoKit)
- Format per chunk: `[4-byte length] + [nonce + ciphertext + tag]`
- Write to FileHandle immediately for crash resilience
- CommonCrypto doesn't support GCM mode (kCCModeGCM unavailable in public API)

**Decryption** (Streaming):
- Use `StreamDecryptionManager` class
- `stream()` method returns array of decrypted chunks
- Each chunk is base64-encoded for transport to JS
- No disk write - all decryption happens in memory
- Returns: `[[String: Any]]` with keys: `data` (base64), `index`, `isLast`

**Permissions**:
- Check `AVAudioSession.recordPermission`
- Request via `requestRecordPermission()`

**Concurrency**:
- Modern Swift async/await where appropriate
- Audio tap runs on dedicated queue

## MODULE INTERFACE (TypeScript/Expo)

```typescript
// Main Module Interface
interface SecureRecorder {
  // Recording (auto-stops at 4 hours or 500MB)
  static startRecording(sessionId: string): Promise<string>;
  static stopRecording(): Promise<string>;
  static getStatus(): Promise<RecordingStatus>;
  
  // Permissions
  static hasPermission(): Promise<boolean>;
  static requestPermission(): Promise<boolean>;
  
  // Decryption
  /**
   * Get decrypted audio chunks as collection
   * SECURITY: No disk write, all chunks in RAM
   * SOLID: Returns collection object with methods
   */
  static getChunks(encryptedPath: string): Promise<AudioChunkCollection>;
}

// Audio Chunk (Single Chunk Primitive)
class AudioChunk {
  // Properties
  readonly index: number;
  readonly isLast: boolean;
  
  // Methods
  getData(): string; // Get base64-encoded data
  getSize(): number; // Get decoded size in bytes
  
  // Factory
  static fromRaw(raw: RawChunk): AudioChunk; // Create from native module data
}

// Audio Chunks Collection (SOLID: Single Responsibility)
class AudioChunkCollection {
  // Properties
  readonly length: number;
  
  // Access
  at(index: number): AudioChunk | undefined;
  dataAt(index: number): string | undefined; // Get base64 at index
  
  // Primary Operations
  toBase64(): string; // Merge all chunks → single base64 string
  toBase64Array(): string[]; // Get array of base64 strings
  
  // Iteration
  forEach(callback: (chunk: AudioChunk, index: number) => void): void;
  forEachAsync(callback: (chunk: AudioChunk, index: number) => Promise<void>): Promise<void>;
  [Symbol.iterator](): Iterator<AudioChunk>;
  
  // Transformation
  map<T>(callback: (chunk: AudioChunk, index: number) => T): T[];
  filter(predicate: (chunk: AudioChunk, index: number) => boolean): AudioChunkCollection;
  slice(start?: number, end?: number): AudioChunkCollection;
  
  // Metadata
  getTotalSize(): number; // Total bytes (sum of chunk sizes)
  getDuration(sampleRate?: number, bytesPerSample?: number): number; // Duration in seconds
  
  // Conversion
  toArray(): ReadonlyArray<AudioChunk>;
  
  // Factory
  static fromRaw(rawChunks: RawChunk[]): AudioChunkCollection; // Create from native data
}
```

**Error Handling**:
- Throw descriptive errors with codes
- Never expose sensitive data in error messages
- Handle permission denial gracefully

## MODEL INTEGRATION PATTERNS

### Whisper (OpenAI ASR) - Full Audio Required

```typescript
import { SecureRecorder } from '@/modules/secure-recorder';
import { decode } from 'react-native-quick-base64';
import { InferenceSession } from 'onnxruntime-react-native';

async function transcribeWithWhisper(encryptedPath: string): Promise<string> {
  // Get chunks collection
  const chunks = await SecureRecorder.getChunks(encryptedPath);
  
  // Merge all chunks into single base64 string
  const fullAudioBase64 = chunks.toBase64();
  
  // Decode to Uint8Array (React Native)
  const fullAudio = decode(fullAudioBase64);
  
  // fullAudio: Uint8Array with PCM-16 data (16kHz mono, 16-bit signed integers)
  // ~460MB for 4-hour recording - safe with recording limits
  
  // Convert PCM to mel-spectrogram (Whisper input format)
  const melSpectrogram = audioToMelSpectrogram(fullAudio, {
    sampleRate: 16000,
    nMels: 80,
    hopLength: 160
  });
  
  // Run Whisper inference
  const session = await InferenceSession.create('whisper-base.onnx');
  const result = await session.run({
    audio_features: new Tensor('float32', melSpectrogram, [1, 80, 3000])
  });
  
  // Decode tokens to text
  const transcript = decodeWhisperTokens(result.output_ids);
  
  // fullAudio automatically released when out of scope
  return transcript;
}
```

### Sherpa-ONNX Speaker Recognition - Full Audio Required

```typescript
import { SecureRecorder } from '@/modules/secure-recorder';
import { decode } from 'react-native-quick-base64';
import { InferenceSession } from 'onnxruntime-react-native';

async function extractSpeakerVector(encryptedPath: string): Promise<Float32Array> {
  // Get chunks collection
  const chunks = await SecureRecorder.getChunks(encryptedPath);
  
  // Merge into single base64 string and decode
  const fullAudioBase64 = chunks.toBase64();
  const fullAudio = decode(fullAudioBase64);
  
  // Extract features (mel-spectrogram or fbank)
  const features = extractAudioFeatures(fullAudio, {
    sampleRate: 16000,
    // Sherpa speaker model parameters
  });
  
  // Run speaker recognition inference
  const session = await InferenceSession.create('3dspeaker_speechbrain.onnx');
  const result = await session.run({
    input: new Tensor('float32', features, [1, featureLength, featureDim])
  });
  
  // Extract embedding vector
  const embedding = result.embedding.data as Float32Array;
  
  // Normalize and return
  return normalizeVector(embedding);
}
```

### Sherpa-ONNX Streaming ASR - Sequential Chunk Processing

```typescript
import { SecureRecorder } from '@/modules/secure-recorder';
import { decode } from 'react-native-quick-base64';
import { createStreamingRecognizer } from 'sherpa-onnx-react-native';

async function transcribeWithSherpaStreaming(encryptedPath: string): Promise<string> {
  // Get chunks collection
  const chunks = await SecureRecorder.getChunks(encryptedPath);
  
  // Create streaming recognizer (maintains state between chunks)
  const recognizer = await createStreamingRecognizer({
    modelPath: 'sherpa-zipformer-streaming.onnx',
    tokensPath: 'tokens.txt',
    sampleRate: 16000
  });
  
  // Iterate over chunks (collection is iterable)
  for (const chunk of chunks) {
    // Get base64 data from chunk
    const base64Data = chunk.getData();
    const pcmBuffer = decode(base64Data);
    
    // Feed to recognizer (updates internal state)
    recognizer.acceptWaveform(pcmBuffer, 16000);
    
    // Optional: Get partial results in real-time
    if (chunk.index % 10 === 0) {
      const partial = recognizer.getResult();
      console.log('Partial transcript:', partial.text);
    }
  }
  
  // Signal end of audio
  recognizer.inputFinished();
  
  // Get final transcript
  const finalResult = recognizer.getResult();
  return finalResult.text;
}
```

### Custom Processing - Collection Methods

```typescript
import { SecureRecorder } from '@/modules/secure-recorder';
import { decode } from 'react-native-quick-base64';

async function customAudioProcessing(encryptedPath: string) {
  // Get chunks collection
  const chunks = await SecureRecorder.getChunks(encryptedPath);
  
  // Get metadata
  console.log(`Total duration: ${chunks.getDuration()}s`);
  console.log(`Total size: ${chunks.getTotalSize()} bytes`);
  console.log(`Number of chunks: ${chunks.length}`);
  
  // Process chunks asynchronously
  await chunks.forEachAsync(async (chunk, index) => {
    const base64Data = chunk.getData();
    const pcm = decode(base64Data);
    
    // Custom per-chunk processing
    const features = extractFeatures(pcm);
    const analysis = await analyzeChunkAsync(features);
    
    console.log(`Chunk ${index + 1}/${chunks.length}:`, analysis);
  });
  
  console.log('Processing complete');
}

// Example: Process only first 30 seconds
async function processFirstMinute(encryptedPath: string) {
  const chunks = await SecureRecorder.getChunks(encryptedPath);
  
  // Assuming ~1 chunk per second at 16kHz
  const firstMinute = chunks.slice(0, 60);
  const audioBase64 = firstMinute.toBase64();
  const audio = decode(audioBase64);
  
  return await processAudio(audio);
}

// Example: Find loud segments
async function findLoudSegments(encryptedPath: string) {
  const chunks = await SecureRecorder.getChunks(encryptedPath);
  
  const loudChunkIndices = chunks
    .map((chunk, index) => {
      const base64Data = chunk.getData();
      const pcm = decode(base64Data);
      const volume = calculateVolume(pcm);
      return { index, volume };
    })
    .filter(item => item.volume > THRESHOLD)
    .map(item => item.index);
  
  console.log('Loud segments at chunks:', loudChunkIndices);
}
```

### Memory Management Best Practices

```typescript
async function processLargeRecording(encryptedPath: string) {
  // Pattern 1: Explicit scope for full audio
  {
    const chunks = await SecureRecorder.getChunks(encryptedPath);
    const fullAudioBase64 = chunks.toBase64();
    const fullAudio = decode(fullAudioBase64);
    const transcript = await whisperModel.transcribe(fullAudio);
    // fullAudio released when exiting block
  }
  
  // Pattern 2: Process chunks without accumulation
  const chunks = await SecureRecorder.getChunks(encryptedPath);
  for (const chunk of chunks) {
    const base64Data = chunk.getData();
    const pcm = decode(base64Data);
    await processChunk(pcm);
    // pcm released after each iteration
  }
  
  // Pattern 3: Async iteration (cleaner)
  const chunks = await SecureRecorder.getChunks(encryptedPath);
  await chunks.forEachAsync(async (chunk) => {
    const base64Data = chunk.getData();
    const pcm = decode(base64Data);
    await processChunk(pcm);
  });
  
  // Pattern 4: Explicit garbage collection hint (if needed)
  if (global.gc) {
    global.gc();
  }
}
```

## ARCHITECTURE PATTERNS

### Dependency Inversion

All implementations use interfaces/protocols:
- `KeyManager` - Key generation and retrieval
- `PermissionManager` - Permission checks
- `AudioRecorder` - Platform audio capture
- `EncryptionStreamManager` - Chunked encryption with length headers (recording)
- `StreamDecryptionManager` - Streaming decryption for on-demand processing
- `RecordingSession` - Session lifecycle orchestration with duration/size limits

### Isomorphic Behavior

Android and iOS implementations must be functionally identical:
- **Same file format**: Chunked sealed boxes with per-chunk IVs
- **Same encryption**: AES-256-GCM, 12-byte IV, 16-byte tag per chunk
- **Same behavior**: Each audio buffer encrypted independently and written immediately
- **Same error conditions**: Matching exception types and messages
- **Matching test suites**: Cross-platform decryption compatibility tests

### Testing

**Isomorphic Test Suites**: Android and iOS tests must mirror each other exactly.

Each component requires:
- **Unit tests for all public methods** (same test cases, same assertions on both platforms)
- **Integration tests for encryption/decryption round-trip** (verify cross-platform compatibility)
- **Error path testing** (uninitialized, permission denied, etc.) - same error conditions on both platforms
- **Memory leak testing** for long recordings
- **Test naming**: Use identical test names/descriptions across platforms (e.g., `testMultipleWritesCreateMultipleSealedBoxes`)
- **Test structure**: Same setup, same scenarios, same expected outcomes

**Cross-Platform Validation**: Tests must verify that data encrypted on one platform can be decrypted on the other (when using same key).

## CODE STYLE

### Comments

Focus on **WHY** (especially security decisions), not WHAT:

```kotlin
// SECURITY: Nonce written first for IV independence per NIST SP 800-38D
fileOutputStream.write(nonce)
```

### Modern Practices

**Kotlin**:
- Coroutines for async operations
- Null safety (avoid `!!`)
- Explicit types for security-critical values

**Swift**:
- async/await for permission requests
- Strong typing with `Data` for keys
- Platform guards (`#if os(iOS)`) for iOS-specific code

### Production Quality

- Proper resource cleanup (close streams, release cryptors)
- Thread-safe state management
- Cancel-safe async operations
- No magic numbers (use named constants)

## SECURITY CHECKLIST

Before committing any SecureRecorder code, verify:

- [ ] No plaintext audio written to disk
- [ ] AES-256-GCM used (not AES-CBC or other modes)
- [ ] Unique nonce per recording session
- [ ] Keys stored in hardware-backed storage only
- [ ] Keys accessible after first unlock (not "always" or "passcode")
- [ ] Proper GCM tag verification on decryption (future feature)
- [ ] No key material in logs or error messages
- [ ] Permission checked before recording
- [ ] Resources cleaned up on error paths
- [ ] Tests verify encryption is actually happening (not plaintext)
