---
description: "One class per file - file name must match export name exactly"
alwaysApply: true
---

# One Class Per File - Structure

## Principle

**Every class, interface, enum, or struct lives in its own dedicated file.**

Part of TypeScript standards. See `typescript.md` for the full guidelines. Classes in those files must follow visibility and ordering: `typescript-visibility.md`, `typescript-code-organization.md`.

This improves:
- ✅ **Discoverability**: Easy to find where a class is defined
- ✅ **Maintainability**: Clear file boundaries
- ✅ **Navigation**: IDE navigation works perfectly
- ✅ **Git history**: File-level changes are cleaner

---

## TypeScript/React Native Module

### Source Files (`src/`)

| File | Class/Type | Description |
|------|------------|-------------|
| `AudioChunk.ts` | `AudioChunk` | Single audio chunk primitive |
| `AudioChunkCollection.ts` | `AudioChunkCollection` | Collection of audio chunks |
| `SecureRecorderModule.ts` | Interfaces | Native module TypeScript interface |
| `index.ts` | `SecureRecorder` | Main API class (exports) |

**Example:**
```
src/
├── AudioChunk.ts                    ← AudioChunk class
├── AudioChunkCollection.ts          ← AudioChunkCollection class
├── SecureRecorderModule.ts          ← Type definitions
└── index.ts                         ← SecureRecorder class (main API)
```

---

## iOS Native Module (Swift)

### Main Files (`ios/`)

| File | Class/Type | Description |
|------|------------|-------------|
| `SecureRecorderModule.swift` | `SecureRecorderModule` | Expo module (main) |
| `RecordingSession.swift` | `RecordingSession` | Session orchestration |
| `AudioRecorder.swift` | `AudioRecorder` | Audio capture |
| `AudioConfig.swift` | `AudioConfig` protocol + `DefaultAudioConfig` | Audio configuration |
| `EncryptionStreamManager.swift` | `EncryptionStreamManager` | Encryption during recording |
| `StreamDecryptionManager.swift` | `StreamDecryptionManager` | Streaming decryption |
| `DecryptionStreamManager.swift` | `DecryptionStreamManager` | Legacy decryption (to be removed) |
| `KeyManager.swift` | `KeyManager` | Keychain operations |
| `PermissionManager.swift` | `PermissionManager` | Permission handling |
| `RecordingState.swift` | `RecordingState` struct | Immutable state |
| `SecureRecorderError.swift` | `SecureRecorderError` enum | Error types |

**Example:**
```
ios/
├── SecureRecorderModule.swift       ← SecureRecorderModule class
├── RecordingSession.swift           ← RecordingSession class
├── AudioRecorder.swift              ← AudioRecorder class
├── AudioConfig.swift                ← AudioConfig protocol + DefaultAudioConfig class
├── EncryptionStreamManager.swift   ← EncryptionStreamManager class
├── StreamDecryptionManager.swift← StreamDecryptionManager class
├── KeyManager.swift                 ← KeyManager class
├── PermissionManager.swift          ← PermissionManager class
├── RecordingState.swift             ← RecordingState struct
└── SecureRecorderError.swift        ← SecureRecorderError enum
```

---

## Android Native Module (Kotlin)

### Main Files (`android/src/main/java/expo/modules/securerecorder/`)

| File | Class/Type | Description |
|------|------------|-------------|
| `SecureRecorderModule.kt` | `SecureRecorderModule` | Expo module (main) |
| `RecordingSession.kt` | `RecordingSession` | Session orchestration |
| `AudioRecorder.kt` | `AudioRecorder` | Audio capture |
| `AudioConfig.kt` | `AudioConfig` interface + `DefaultAudioConfig` | Audio configuration |
| `EncryptionStreamManager.kt` | `EncryptionStreamManager` | Encryption during recording |
| `StreamDecryptionManager.kt` | `StreamDecryptionManager` | Streaming decryption |
| `DecryptionStreamManager.kt` | `DecryptionStreamManager` | Legacy decryption (to be removed) |
| `KeyManager.kt` | `KeyManager` | KeyStore operations |
| `PermissionManager.kt` | `PermissionManager` | Permission handling |
| `RecordingState.kt` | `RecordingState` data class | Immutable state |
| `SecureRecorderException.kt` | `SecureRecorderException` | Base exception (sealed) |
| `RecordingInProgressException.kt` | `RecordingInProgressException` | Exception subclass |
| `PermissionDeniedException.kt` | `PermissionDeniedException` | Exception subclass |
| `NoRecordingException.kt` | `NoRecordingException` | Exception subclass |
| `InitializationException.kt` | `InitializationException` | Exception subclass |
| `KeyStoreException.kt` | `KeyStoreException` | Exception subclass |

**Example:**
```
android/src/main/java/expo/modules/securerecorder/
├── SecureRecorderModule.kt          ← SecureRecorderModule class
├── RecordingSession.kt              ← RecordingSession class
├── AudioRecorder.kt                 ← AudioRecorder class
├── AudioConfig.kt                   ← AudioConfig interface + DefaultAudioConfig object
├── EncryptionStreamManager.kt      ← EncryptionStreamManager class
├── StreamDecryptionManager.kt   ← StreamDecryptionManager class
├── KeyManager.kt                    ← KeyManager class
├── PermissionManager.kt             ← PermissionManager class
├── RecordingState.kt                ← RecordingState data class
├── SecureRecorderException.kt       ← SecureRecorderException sealed class
├── RecordingInProgressException.kt  ← RecordingInProgressException class
├── PermissionDeniedException.kt     ← PermissionDeniedException class
├── NoRecordingException.kt          ← NoRecordingException class
├── InitializationException.kt       ← InitializationException class
└── KeyStoreException.kt             ← KeyStoreException class
```

---

## Special Cases

### 1. AudioConfig (iOS and Android)

**Contains**: Protocol/Interface + Default Implementation

This is acceptable because:
- The protocol/interface and its default implementation are tightly coupled
- Both are small and related
- This is a common pattern in both Swift and Kotlin

**iOS (`AudioConfig.swift`)**:
```swift
protocol AudioConfig { ... }
class DefaultAudioConfig: AudioConfig { ... }
```

**Android (`AudioConfig.kt`)**:
```kotlin
interface AudioConfig { ... }
object DefaultAudioConfig : AudioConfig { ... }
```

### 2. Sealed Classes (Kotlin)

**SecureRecorderException** is a sealed class with subclasses in **separate files** (Kotlin 1.5+).

Before Kotlin 1.5, sealed classes required all subclasses in the same file. Now they can be in separate files within the same package.

---

## Benefits

### 1. **Clear Navigation**
```
Want to find AudioChunk? → AudioChunk.ts
Want to find RecordingSession? → RecordingSession.swift or RecordingSession.kt
Want to find EncryptionStreamManager? → EncryptionStreamManager.swift or .kt
```

### 2. **Clean Git History**
```
git log AudioChunk.ts          # Only changes to AudioChunk
git log RecordingSession.swift # Only changes to RecordingSession
```

### 3. **Better IDE Support**
- Jump to definition works perfectly
- Search finds exact file immediately
- No ambiguity in imports

### 4. **Easier Code Review**
- File changes map directly to class changes
- Smaller, focused diffs
- Clear separation of concerns

---

## File Naming Convention

| Type | File Name | Example |
|------|-----------|---------|
| **Class** | `ClassName.ext` | `AudioChunk.ts` |
| **Interface/Protocol** | `InterfaceName.ext` | `AudioConfig.swift` |
| **Enum** | `EnumName.ext` | `SecureRecorderError.swift` |
| **Sealed Class** | `ClassName.ext` | `SecureRecorderException.kt` |
| **Data Class** | `ClassName.ext` | `RecordingState.kt` |
| **Struct** | `StructName.ext` | `RecordingState.swift` |

**Rule**: File name = Class/Type name (PascalCase)

---

## Exceptions (When Multiple Types Are OK)

1. **Type definitions file** (e.g., `SecureRecorderModule.ts` with interfaces)
2. **Protocol + Default Implementation** (e.g., `AudioConfig.swift`)
3. **Main export file** (e.g., `index.ts` with re-exports)

---

## Verification

### Check TypeScript
```bash
# Should see one class per file
ls -1 modules/secure-recorder/src/*.ts
```

### Check iOS
```bash
# Should see one class per file
ls -1 modules/secure-recorder/ios/*.swift | grep -v Tests
```

### Check Android
```bash
# Should see one class per file
ls -1 modules/secure-recorder/android/src/main/java/expo/modules/securerecorder/*.kt
```

---

## Summary

✅ **TypeScript**: 1 class per file (✅ Fixed: split `AudioChunk` and `AudioChunkCollection`)  
✅ **iOS (Swift)**: 1 class/protocol/enum/struct per file  
✅ **Android (Kotlin)**: 1 class per file (✅ Fixed: split sealed class exceptions)

**Result**: Clean, navigable, maintainable codebase! 🎉
