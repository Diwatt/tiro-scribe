# Core Services

This directory contains the core business logic services for the Open Luborsky Mobile application.

## Services Overview

### BiocodeService
Handles voice identity and biocoding:
- Extracts speaker vectors using `sherpa-onnx`
- Calculates cosine similarity for speaker recognition
- Implements salting: `Hash(SpeakerVector + TherapistID_Salt) = PatientID`

**Usage:**
```typescript
const biocodeService = new BiocodeService();
await biocodeService.initialize(sherpaOnnxModule);
biocodeService.setTherapistSalt(therapistId);
const result = await biocodeService.processAudio(audioPath);
```

### AnonymizerService
Implements hybrid three-layer anonymization:
1. **AI Layer**: ONNX BERT-NER for detecting persons and locations
2. **Heuristics Layer**: Regex patterns for family/work relations
3. **Temporal Layer**: Date/time conversion to relative timestamps

**Usage:**
```typescript
const anonymizerService = new AnonymizerService();
await anonymizerService.initialize(onnxRuntime, modelPath);
anonymizerService.setSessionStartDate(sessionStartDate);
const result = await anonymizerService.anonymize(rawText);
```

### AudioProcessingService
Orchestrates the complete audio processing pipeline:
- Coordinates Whisper transcription
- Coordinates text anonymization
- Coordinates biocode extraction
- Combines results into final payload

**Usage:**
```typescript
const audioProcessingService = new AudioProcessingService(
  biocodeService,
  anonymizerService
);
await audioProcessingService.initialize(whisperRN);
const payload = await audioProcessingService.processAudio(
  audioPath,
  sessionId,
  sessionStartDate
);
```

## Initialization Pattern

All services follow an async initialization pattern:
1. Create service instance
2. Call `initialize()` with native module
3. Configure service (e.g., set therapist salt, session date)
4. Use service methods

## Error Handling

Services throw errors if:
- Not initialized before use
- Required configuration is missing
- Native module operations fail

Always wrap service calls in try/catch blocks.
