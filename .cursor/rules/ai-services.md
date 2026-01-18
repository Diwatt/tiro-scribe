---
description: "AI service implementation patterns and native module integration"
alwaysApply: false
globs: ["**/services/**/*.ts", "**/services/**/*.tsx"]
---

# AI Services Implementation Rules

## Native Module Integration

This project uses ONNX Runtime for all AI model inference:

1. **onnxruntime-react-native** - Core inference engine for all models:
   - Speaker recognition models (Sherpa-ONNX format)
   - BERT-NER models for text anonymization
   - Transcription models (when available)

## Service Initialization Pattern

All AI services follow this initialization pattern:

```typescript
class MyService {
  private nativeModule: NativeModuleInterface | null = null;

  async initialize(nativeModule: NativeModuleInterface): Promise<void> {
    this.nativeModule = nativeModule;
    // Additional setup (model loading, etc.)
  }

  async process(data: InputType): Promise<OutputType> {
    if (!this.nativeModule) {
      throw new Error('Service not initialized. Call initialize() first.');
    }
    // Use nativeModule...
  }
}
```

## BiocodeService Specifics

- **Speaker Vector Extraction**: Use ONNX Runtime to load Sherpa-ONNX speaker recognition models
- **Model Loading**: Models are downloaded automatically via `ModelDownloader` on first launch
- **Cosine Similarity**: Implemented manually (no native module dependency)
- **Salting**: Always use `Hash(SpeakerVector + TherapistID_Salt)` for patient ID generation
- **Deterministic Hashing**: Use SHA-256 for consistent biocode generation

## AnonymizerService Specifics

### Layer 1: ONNX BERT-NER
- Load quantized model: `ort.InferenceSession.create(modelPath)`
- Run inference: Use ONNX Runtime session.run() with proper input tensors
- Extract entities: Filter for `PER` (Person) and `LOC` (Location) labels
- Confidence threshold: Use model confidence scores
- Models downloaded automatically via `ModelDownloader`

### Layer 2: Heuristic Rules
- Family relations: `mother`, `father`, `dad`, `mom`, `sister`, `brother`, etc.
- Work relations: `boss`, `manager`, `colleague`, `employee`, etc.
- Use regex patterns with word boundaries (`\b`)
- Check for overlapping entities before adding new ones

### Layer 3: Temporal Fuzzing
- **Date Conversion**: Convert absolute dates to relative (`Day +N` or `Day -N`)
- **Time Conversion**: Fuzz specific times to `[TIME_FUZZED]`
- **Preserve Timeline**: Don't destroy dates, convert to relative format
- **Session Context**: Use `sessionStartDate` as reference point

## Error Handling

- Always check if service is initialized before use
- Provide fallback implementations where possible
- Log errors but never expose PII in error messages
- Return empty arrays/objects instead of throwing when possible (for non-critical operations)

## Model Paths

- Store model paths in `@Util/Constant.ts`
- Models are downloaded automatically on first launch via `ModelDownloader`
- Models cached in document directory for offline use
- Configure model URLs in `ModelDownloader.MODEL_CONFIGS`

## Performance Considerations

- Load models once during app initialization
- Cache model instances in service classes
- Use async/await for all native module calls
- Consider background processing for long-running operations
