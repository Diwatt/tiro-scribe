# Proxy Folder Exception

**Rule**: Classes in the `Proxy/` folder are exempt from isomorphic implementation requirements.

## Why
- Proxy classes provide platform-specific implementations that wrap native APIs
- They expose a common interface but implementation details differ by platform
- The Proxy layer is intentionally platform-specific to bridge platform differences

## Scope
- **Applies to**: All classes in `modules/secure-recorder/ios/Proxy/` and `modules/secure-recorder/android/.../Proxy/`
- **Example**: `Proxy/AudioRecord.swift` (iOS) and `Proxy/AudioRecord.kt` (Android) can have different internal implementations while maintaining the same public API

## What This Means
- Proxy classes should have **isomorphic public APIs** (same method signatures, same behavior)
- Proxy classes can have **different internal implementations** (platform-specific code is allowed)
- Proxy classes don't need to match internal structure, only the public contract

## Examples

✅ **Allowed**:
- iOS `Proxy/AudioRecord` uses `AVAudioEngine` with buffer queue (push→pull conversion)
- Android `Proxy/AudioRecord` wraps platform `AudioRecord` directly
- Different internal data structures, algorithms, or platform APIs

❌ **Not Allowed**:
- Different public method signatures
- Different return types for same methods
- Different behavior/contracts

## Related Rules
- See `isomorphic-implementation.md` for general isomorphic requirements
- Proxy classes are the exception to the isomorphic rule
