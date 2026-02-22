---
applyTo: "**/*"
---

# Tech Stack & Architectural Layers

## 1. Foundation Layer
- **Framework:** React Native (Expo) – Latest version only, targeting iOS and Android exclusively
- **JavaScript Engine:** Hermes only – No support for JSC, V8, or web environments
- **State Management:** @legendapp/state – Observable-based reactive state
- **Build System:** Metro bundler with TypeScript support
- **Package Manager:** pnpm with workspace configuration
- **Platform Support:** iOS and Android only – No web, desktop, or legacy React Native versions

## 2. Security & Privacy Layer
- **Audio Encryption:** AES-256-GCM chunked encryption (native)
- **Native Module:** SecureRecorder – Isomorphic iOS/Android implementation
- **Key Storage:** Hardware-backed Keychain/AndroidKeyStore
- **Biocode Protocol:** `Hash(SpeakerVector + TherapistIdentifier_Salt)`
- **Anonymization:** 3-layer approach (ONNX BERT + Heuristics + Temporal Fuzzing)

## 3. Audio Processing & Inference
- **Audio Capture:** 16kHz PCM mono, UNPROCESSED/RAW hardware mode
- **Runtime:** ONNX Runtime – Cross-platform neural network inference
- **Model Framework:** Sherpa-ONNX – Optimized audio processing pipelines
- **Core Models:**
  - VAD: Silero VAD v5 (voice activity detection)
  - ASR: Whisper Medium (speech recognition)
  - Speaker: CAM++ (speaker recognition)
  - Pitch: CREPE (fundamental frequency extraction)
- **Processing Pattern:** "Store now, process later" – deferred AI on charger

## 4. Data & Storage Layer
- **Primary Database:** Expo SQLite with Kysely query builder
- **File Storage:** Expo FileSystem for encrypted audio (.enc files)
- **Preferences:** Expo SecureStore for sensitive configuration
- **Schema:** Domain-driven entities (Encounter, Transcription, ProsodyMetrics, etc.)
- **Time Unit:** Integer milliseconds for all durations and timestamps

## 5. UI & Presentation Layer
- **Component Library:** React Native Paper (Material Design 3)
- **Icons:** Lucide Icons – Consistent iconography
- **Typography:** Material Design 3 type scale via `Text variant="..."`
- **Navigation:** React Navigation with type-safe routing
- **Localization:** typesafe-i18n with compile-time validation

## 6. Architectural Patterns
- **Local-First:** No raw audio ever leaves the device
- **Dual-Stream Processing:** DSP (measurement) + ASR (transcription) pipelines
- **Chunked Encryption:** `[Size 4B][IV 12B][Ciphertext + Tag]` per block
- **Isomorphic Native Code:** Identical Swift/Kotlin implementations
- **Domain-Driven Design:** Entities reflect clinical domain concepts
- **Two Operating Modes:** Standard (Clinical) vs Incognito (Bunker)

## 7. Development & Quality
- **Testing:** Vitest for unit tests, Jest for native modules
- **Linting/Formatting:** Biome – unified toolchain
- **Type Safety:** TypeScript with strict configuration
- **Code Generation:** OpenAPI client generation from spec.yaml
- **Documentation:** Architecture-first approach with `docs/app_design_architecture.md`

## 8. Core Principles
1. **Privacy by Design:** PII anonymized before any storage or transmission
2. **Clinical Neutrality:** Provide measurements, not diagnoses or interpretations
3. **Traceability:** All processing results signed with algorithm/model metadata
4. **Resilience:** Queue-based processing with checkpoint resumption
5. **Maintainability:** One class per file, explicit visibility, no utils folders
6. **Platform Focus:** Latest Expo React Native only, Hermes engine exclusively on iOS and Android – no web, desktop, JSC, V8, or legacy platform support

---

**Reference:** Always consult `docs/app_design_architecture.md` for the complete architectural context and implementation status.