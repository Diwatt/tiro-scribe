---
description: "SOLID design principles for AudioChunkCollection - single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion"
alwaysApply: true
---

# SOLID Design: AudioChunkCollection

## The Problem (Before)

❌ **Violates Single Responsibility**:
```typescript
// SecureRecorder class doing too much
SecureRecorder.stream()      // Decryption
SecureRecorder.decodeChunk()           // Decoding
SecureRecorder.concatenateChunks()     // Concatenation
SecureRecorder.decryptAndConcatenate() // Combined operation
```

❌ **Poor Encapsulation**:
- Helper methods scattered across main class
- No cohesive collection abstraction
- Hard to extend with new operations

---

## The Solution (SOLID Principles)

### ✅ **Single Responsibility Principle**

Each class has ONE reason to change:

| Class | Responsibility |
|-------|---------------|
| `SecureRecorder` | Recording, permissions, decryption orchestration |
| `AudioChunkCollection` | Collection operations on decrypted chunks |
| `AudioChunk` | Data representation of single chunk |

### ✅ **Open/Closed Principle**

`AudioChunkCollection` is open for extension, closed for modification:

```typescript
// Can add new methods without changing SecureRecorder
class AudioChunkCollection {
  // Existing methods stay stable
  toBase64(): string { ... }
  
  // New methods can be added easily
  async streamToFile(path: string): Promise<void> { ... }
  toWav(): WavFile { ... }
  normalize(): AudioChunkCollection { ... }
}
```

### ✅ **Liskov Substitution Principle**

Collection implements standard interfaces:

```typescript
// Iterable - works with for...of
for (const chunk of chunks) { ... }

// Array-like - familiar methods
chunks.forEach(...)
chunks.map(...)
chunks.filter(...)
chunks.slice(...)
```

### ✅ **Interface Segregation Principle**

Clean, focused API - no bloat:

```typescript
// Primary operations only
chunks.toBase64()          // Merge chunks
chunks.at(index)           // Access single chunk
chunks.forEach(callback)   // Iterate

// Metadata separate from data operations
chunks.getDuration()
chunks.getTotalSize()
```

### ✅ **Dependency Inversion Principle**

Code depends on abstractions, not concretions:

```typescript
// Works with any AudioChunk implementation
interface AudioChunk {
  readonly data: string;
  readonly index: number;
  readonly isLast: boolean;
}

// Collection is type-safe
class AudioChunkCollection {
  constructor(chunks: AudioChunk[]) { ... }
}
```

---

## API Design

### Clean, Cohesive Interface

```typescript
import { SecureRecorder, AudioChunkCollection } from '@/modules/secure-recorder';

// 1. Get chunks collection (Single responsibility: SecureRecorder does decryption)
const chunks: AudioChunkCollection = await SecureRecorder.getChunks(path);

// 2. Use collection methods (Single responsibility: Collection handles operations)
const fullAudio = chunks.toBase64();
const duration = chunks.getDuration();
const firstMinute = chunks.slice(0, 60);

// 3. Iterate naturally
for (const chunk of chunks) {
  const data = AudioChunkCollection.getChunkData(chunk);
  await process(data);
}
```

---

## Better Names

### Before → After

| Old Name | New Name | Reason |
|----------|----------|--------|
| `stream()` | `getChunks()` | More descriptive, clearer intent |
| `decryptAndConcatenate()` | `chunks.toBase64()` | Method on collection, not static helper |
| `concatenateChunks()` | `chunks.toBase64()` | Built into collection |
| `decodeChunk()` | `getChunkData()` | Platform-agnostic (returns base64) |

---

## Usage Examples

### Pattern 1: Full Audio Models (Whisper, Speaker Recognition)

```typescript
import { SecureRecorder } from '@/modules/secure-recorder';

// Get chunks
const chunks = await SecureRecorder.getChunks(encryptedPath);

// Merge all chunks
const fullAudioBase64 = chunks.toBase64();

// Decode platform-specifically
const pcmData = Buffer.from(fullAudioBase64, 'base64'); // Node.js
// or
const pcmData = decode(fullAudioBase64); // React Native with base64 library

// Pass to model
const transcript = await whisperModel.transcribe(pcmData);
```

### Pattern 2: Streaming Models (Sherpa-ONNX Streaming ASR)

```typescript
import { SecureRecorder, AudioChunkCollection } from '@/modules/secure-recorder';

// Get chunks
const chunks = await SecureRecorder.getChunks(encryptedPath);

// Create recognizer
const recognizer = await createStreamingRecognizer(modelConfig);

// Iterate (collection is iterable!)
for (const chunk of chunks) {
  const base64Data = AudioChunkCollection.getChunkData(chunk);
  const pcmData = decode(base64Data);
  
  recognizer.acceptWaveform(pcmData, 16000);
}

recognizer.inputFinished();
const transcript = recognizer.getResult();
```

### Pattern 3: Collection Methods

```typescript
// Get metadata
console.log(`Duration: ${chunks.getDuration()}s`);
console.log(`Chunks: ${chunks.length}`);
console.log(`Size: ${chunks.getTotalSize()} bytes`);

// Async iteration
await chunks.forEachAsync(async (chunk, index) => {
  const data = AudioChunkCollection.getChunkData(chunk);
  await processAsync(data);
});

// Slicing
const firstMinute = chunks.slice(0, 60);
const last10Chunks = chunks.slice(-10);

// Filtering
const largeChunks = chunks.filter(c => c.data.length > 1000);

// Mapping
const chunkSizes = chunks.map(c => c.data.length);
```

---

## Benefits of SOLID Design

### 1. **Maintainability**
- Clear responsibilities make bugs easier to find
- Changes to one class don't affect others
- Easy to understand what each class does

### 2. **Extensibility**
- Can add new collection methods without touching `SecureRecorder`
- Can swap chunk implementations
- Can add new audio formats easily

### 3. **Testability**
- Each class can be tested independently
- Mock dependencies easily
- Clear interfaces make test setup simple

### 4. **Readability**
```typescript
// Before: What does this do?
const audio = await SecureRecorder.decryptAndConcatenate(path);

// After: Crystal clear intent
const chunks = await SecureRecorder.getChunks(path);
const audio = chunks.toBase64();
```

### 5. **Reusability**
```typescript
// Collection can be passed around, stored, manipulated
const chunks1 = await SecureRecorder.getChunks(path1);
const chunks2 = await SecureRecorder.getChunks(path2);

// Combine collections
const combined = new AudioChunkCollection([
  ...chunks1.toArray(),
  ...chunks2.toArray()
]);

// Process subset
const firstHalf = chunks1.slice(0, chunks1.length / 2);
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│ SecureRecorder (Main API)              │
│ ─────────────────────────────────────── │
│ + startRecording()                      │
│ + stopRecording()                       │
│ + getChunks() → AudioChunkCollection   │  ← Single responsibility
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ AudioChunkCollection (Collection)      │
│ ─────────────────────────────────────── │
│ + toBase64()         // Merge           │
│ + toBase64Array()    // Individual      │
│ + forEach()          // Iteration       │
│ + forEachAsync()     // Async iteration │
│ + map()              // Transform       │
│ + filter()           // Subset          │
│ + slice()            // Range           │
│ + getDuration()      // Metadata        │
│ + getTotalSize()     // Metadata        │
│ + at(index)          // Access          │
│ + [Symbol.iterator]  // For...of        │
└─────────────────────────────────────────┘
                ↓ contains
┌─────────────────────────────────────────┐
│ AudioChunk (Data)                       │
│ ─────────────────────────────────────── │
│ + data: string       // Base64          │
│ + index: number      // Position        │
│ + isLast: boolean    // End marker      │
└─────────────────────────────────────────┘
```

---

## Migration Guide

### Before (Old API)
```typescript
// Old way
const chunks = await SecureRecorder.stream(path);
const fullAudio = SecureRecorder.concatenateChunks(chunks);

// or
const fullAudio = await SecureRecorder.decryptAndConcatenate(path);
```

### After (SOLID API)
```typescript
// New way
const chunks = await SecureRecorder.getChunks(path);
const fullAudio = chunks.toBase64();
```

### Decoding Platform-Specifically

```typescript
// Node.js
const pcmData = Buffer.from(base64String, 'base64');

// React Native (with react-native-quick-base64)
import { decode } from 'react-native-quick-base64';
const pcmData = decode(base64String);

// Browser
const binaryString = atob(base64String);
const pcmData = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  pcmData[i] = binaryString.charCodeAt(i);
}
```

---

## Conclusion

The refactored design:
- ✅ Follows all 5 SOLID principles
- ✅ More intuitive API (`getChunks()` vs `stream()`)
- ✅ Better encapsulation (collection handles its own operations)
- ✅ Easier to extend (add methods to collection without touching main class)
- ✅ More testable (separate concerns, clear interfaces)
- ✅ Better names (`toBase64()` vs `concatenateChunks()`)
- ✅ Platform-agnostic (base64 strings, let user decode)

**Result**: Clean, maintainable, extensible code that's easy to understand and use.
