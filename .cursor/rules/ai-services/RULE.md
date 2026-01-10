---
description: "AI service implementation patterns and native module integration"
alwaysApply: false
globs: ["**/services/**/*.ts", "**/services/**/*.tsx"]
---

# AI Services Implementation Rules

## Native Module Integration

This project uses three core AI native modules:

1. **whisper.rn** - Speech-to-Text transcription
2. **sherpa-onnx-react-native** - Speaker recognition and diarization
3. **onnxruntime-react-native** - NLP/NER model inference

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

- **Speaker Vector Extraction**: Use `sherpa-onnx.extractSpeakerVector(audioPath)`
- **Cosine Similarity**: Implement fallback calculation if native module doesn't provide it
- **Salting**: Always use `Hash(SpeakerVector + TherapistID_Salt)` for patient ID generation
- **Deterministic Hashing**: Use SHA-256 for consistent biocode generation

## AnonymizerService Specifics

### Layer 1: ONNX BERT-NER
- Load quantized model: `onnxRuntime.loadModel(modelPath)`
- Run inference: `onnxRuntime.runInference(text)`
- Extract entities: Filter for `PER` (Person) and `LOC` (Location) labels
- Confidence threshold: Use model confidence scores

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

- Store model paths in `@utils/constants.ts`
- Use relative paths from app bundle
- Models should be bundled with the app (not downloaded at runtime for security)

## Performance Considerations

- Load models once during app initialization
- Cache model instances in service classes
- Use async/await for all native module calls
- Consider background processing for long-running operations
