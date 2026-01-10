---
description: "Privacy-by-Design architecture principles and data flow requirements"
alwaysApply: true
---

# Privacy-by-Design Architecture Rules

## Core Principle
**No raw audio or unprocessed text ever leaves the device.** All AI processing must occur on-device before any data transmission.

## Data Flow Requirements

1. **Audio Acquisition**
   - All audio recordings must be stored locally first
   - Audio files should be encrypted at rest on device
   - Never send raw audio files to backend servers

2. **Processing Pipeline**
   - Microphone → Raw Audio File (local storage)
   - Raw Audio → Whisper (on-device) → Raw Text
   - Raw Text → AnonymizerService → Clean Text
   - Raw Audio → Sherpa → Biocode (salted)
   - Final Payload: `{ biocode, cleanTranscript, confidence }`

3. **Biocoding Protocol**
   - Speaker vectors must be salted with TherapistID before hashing
   - Formula: `Hash(SpeakerVector + TherapistID_Salt) = PatientID`
   - Never store or transmit raw speaker vectors
   - Biocode must be deterministic for longitudinal tracking

4. **Anonymization Requirements**
   - Three-layer approach: AI (ONNX) + Heuristics + Temporal Fuzzing
   - Direct PII (names, locations) → Tokenized tags
   - Indirect identifiers (family/work relations) → Relation tokens
   - Dates must be converted to relative timestamps, not destroyed
   - Preserve clinical timeline while masking calendar dates

## Security Constraints

- All sensitive operations must be performed in the Services layer
- No PII should appear in logs or error messages
- Database encryption required for local storage
- TLS required for all backend communication
- Implement certificate pinning for API endpoints

## Code Patterns

When implementing new features:
- Check if data contains PII before any network calls
- Use `AnonymizerService` for any text processing
- Use `BiocodeService` for voice identity operations
- Queue all backend syncs for offline-first operation
