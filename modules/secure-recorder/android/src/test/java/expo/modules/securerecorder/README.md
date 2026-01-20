# Secure Recorder Module - Unit Tests

This directory contains unit tests for all Kotlin classes in the secure-recorder module.

## Test Structure

- `SecureRecorderExceptionTest.kt` - Tests for exception hierarchy
- `AudioConfigTest.kt` - Tests for audio configuration
- `RecordingStateTest.kt` - Tests for immutable state data class
- `PermissionManagerTest.kt` - Tests for permission management
- `KeyManagerTest.kt` - Tests for key management (limited due to AndroidKeyStore requirements)
- `AudioRecorderTest.kt` - Tests for audio recording interface
- `EncryptionStreamManagerTest.kt` - Tests for encryption stream operations
- `SecureRecorderModuleTest.kt` - Tests for main module (limited due to Expo infrastructure)

## Running Tests

```bash
cd modules/secure-recorder/android
./gradlew test
```

## Test Coverage

### Fully Testable Components
- ✅ Exception classes
- ✅ Data classes (RecordingState)
- ✅ Configuration classes (AudioConfig)
- ✅ Permission manager (with mocks)
- ✅ Audio recorder interface (with mocks)
- ✅ Encryption stream manager (with real encryption)

### Limited Testability
- ⚠️ KeyManager: Requires AndroidKeyStore (device/emulator needed)
- ⚠️ SecureRecorderModule: Requires Expo module infrastructure

## Dependencies

Tests use:
- **JUnit 4** - Test framework
- **MockK** - Kotlin mocking library
- **Kotlin Coroutines Test** - For testing coroutines

## Integration Tests

For full coverage of `SecureRecorderModule`, integration tests should be created that:
1. Run on Android device/emulator
2. Use Expo's test infrastructure
3. Test actual audio recording and encryption flows

## Notes

- Some tests may require Android environment (AudioRecord, KeyStore)
- MockK is used for mocking dependencies
- Encryption tests use real encryption (not mocked) for accuracy
