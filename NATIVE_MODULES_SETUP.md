# Native Modules Setup Guide

This project requires three native modules for AI processing. These modules need to be installed manually as they may not be available on npm or require custom native configuration.

## Required Native Modules

1. **whisper.rn** - Speech-to-Text transcription using Whisper models
2. **sherpa-onnx-react-native** - Speaker recognition and diarization
3. **onnxruntime-react-native** - ONNX Runtime for BERT-NER model inference

## Installation Steps

### 1. whisper.rn

**Repository:** Check for React Native Whisper implementations
- Look for: `whisper.rn`, `react-native-whisper`, or similar packages
- Alternative: Use `@xenova/transformers` with React Native bindings

**Installation:**
```bash
pnpm install whisper.rn
# or
pnpm install @xenova/transformers
```

**iOS Setup:**
```bash
cd ios && pod install && cd ..
```

**Android Setup:**
- May require additional Gradle configuration
- Check module documentation for Android-specific setup

### 2. sherpa-onnx-react-native

**Repository:** https://github.com/k2-fsa/sherpa-onnx (check for React Native bindings)

**Installation:**
```bash
pnpm install sherpa-onnx-react-native
# or build from source if no npm package exists
```

**iOS Setup:**
- Requires C++ support
- May need to add to Podfile manually
- Link native dependencies

**Android Setup:**
- Add to `android/settings.gradle`
- Configure CMake for native builds
- Update `android/build.gradle`

### 3. onnxruntime-react-native

**Repository:** https://github.com/microsoft/onnxruntime (React Native bindings)

**Installation:**
```bash
pnpm install onnxruntime-react-native
```

**iOS Setup:**
```bash
cd ios && pod install && cd ..
```

**Android Setup:**
- Usually works out of the box
- May require additional Gradle configuration for model loading

## Model Files

### BERT-NER Model
- Download a quantized BERT-NER model (ONNX format)
- Place in `assets/models/bert-ner-quantized.onnx`
- Update path in `src/core/utils/constants.ts` if needed

**Recommended Models:**
- Hugging Face: `dslim/bert-base-NER` (convert to ONNX)
- ONNX Model Zoo: Check for pre-quantized NER models

### Whisper Model
- Download Whisper model (usually provided by whisper.rn)
- Follow module documentation for model placement

### Sherpa Models
- Download speaker recognition models
- Follow sherpa-onnx documentation for model setup

## Integration in App.tsx

Once native modules are installed, uncomment the initialization code in `src/App.tsx`:

```typescript
import WhisperRN from 'whisper.rn';
import SherpaOnnx from 'sherpa-onnx-react-native';
import OnnxRuntime from 'onnxruntime-react-native';

// Then uncomment the initialization code in useEffect
```

## Troubleshooting

### iOS Build Issues
- Ensure C++ standard library is linked
- Check Podfile for required dependencies
- Verify Xcode project settings

### Android Build Issues
- Check `android/build.gradle` for native dependencies
- Ensure CMake is properly configured
- Verify NDK version compatibility

### Model Loading Issues
- Verify model paths are correct
- Check model format (must be ONNX for onnxruntime)
- Ensure models are bundled with app or accessible at runtime

## Testing Native Modules

Create a test file to verify module initialization:

```typescript
// src/core/services/__tests__/NativeModules.test.ts
import WhisperRN from 'whisper.rn';
import SherpaOnnx from 'sherpa-onnx-react-native';
import OnnxRuntime from 'onnxruntime-react-native';

// Test module availability
console.log('WhisperRN:', WhisperRN ? 'Available' : 'Not Available');
console.log('SherpaOnnx:', SherpaOnnx ? 'Available' : 'Not Available');
console.log('OnnxRuntime:', OnnxRuntime ? 'Available' : 'Not Available');
```

## Alternative Approaches

If native modules are not available:

1. **Web-based AI**: Use WebAssembly versions of models
2. **Cloud Processing**: Fallback to secure cloud API (defeats privacy goals)
3. **Hybrid**: Process on-device when possible, queue for cloud when needed

**Note:** The privacy-by-design architecture requires on-device processing. Cloud fallbacks should only be used for non-sensitive operations.
