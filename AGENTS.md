# Tiro Scribe

---

## AI Assistant Workflow

### MCP Tools (Zero-Hallucination Policy)

You have access to MCP servers. Use them proactively:

- **Context7:** ALWAYS use this tool to read the latest official documentation for `expo`, `react-native`, `onnxruntime-react-native`, `kysely`, and `@legendapp/state` before using their APIs to prevent hallucinations
- **Sequential Thinking:** Use this tool to break down complex architectural changes or MVVM refactoring before writing the code

### Native Coding Style (Swift/Kotlin)

- **Visibility:** ALL members must have explicit modifiers (`public`, `private`, `internal`)
- **Ordering:** Properties (private -> public) -> Initializers -> Methods
- **Testing:** Every iOS test case must have an exact equivalent in Android

---

## CRITICAL DO NOT RULES

### Platform & Environment

- **NO Web/Desktop support** — iOS and Android ONLY
- **NO JSC, V8, or web environments** — Hermes engine exclusively
- **NO legacy React Native versions** — Latest Expo React Native only
- **NO raw audio that leaves the device** — Local-first architecture

### Security & Privacy

- **NO raw PCM to temp file** — Flow MUST be `Mic -> Encrypt Chunk -> Disk`
- **NO unencrypted disk I/O** — All audio encrypted chunked with AES-256-GCM
- **NO PII in logs** — Log only relevant identifiers/state
- **NO timestamps in logs** — Logger handles `dateFormat: 'time'`, never add `new Date()`

### Code Structure

- **NO Utils folders** — Logic belongs to classes (Service or Entity)
- **NO standalone functions** — All logic in classes
- **NO `*Service` suffix** — Use capability names (e.g., `VoiceCalibration`)
- **NO object literals in classes** — Use `const INITIAL_STATE` or static factory
- **NO `export const` singletons** — Use `Container.camelCase` pattern
- **NO methods on Container** — Passive holder only; no `init()`, `dispose()`, factories
- **NO `useState`/`useEffect` for business logic** — Use Legend-State observables in State classes

### React & TypeScript

- **NO React.FC** — Use `interface Props` and return `React.JSX.Element`
- **NO abbreviations** (`pk`, `fk`) — Full words only. Exceptions: `id`, `uid`
- **NO JSDoc for simple methods** — Self-documenting code preferred

### Tooling & Formatting

- **NO terminal formatting** — DO NOT run `bun run biome` or `bun run lint`. User handles formatting via `Shift+Alt+S`
- **NO ignore Biome/ESLint errors** — Fix styling, import, or typing issues before finalizing

### Architecture

- **NO top-level `utils` or `i18n`** — Logic in classes; localization in `Localization/`
- **NO direct file imports** — Use domain barrels (`@/Service`, `@/Entity`, etc.)
- **NO backward-compatibility layers** — Until code is ready for release

---

## General

### Architecture
- **Pattern:** MVVM / Domain-Driven Design
- **Local-First:** No raw audio ever leaves the device
- **Dual-Stream Processing:** DSP (measurement) + ASR (transcription) pipelines
- **Two Operating Modes:** Standard (Clinical) vs Incognito (Bunker)
- **Processing Pattern:** "Store now, process later" — deferred AI on charger

### Core Principles
1. **Privacy by Design:** PII anonymized before any storage or transmission
2. **Clinical Neutrality:** Provide measurements, not diagnoses or interpretations
3. **Traceability:** All processing results signed with algorithm/model metadata
4. **Resilience:** Queue-based processing with checkpoint resumption
5. **Maintainability:** One class per file, explicit visibility, no utils folders
6. **Platform Focus:** Latest Expo React Native only, Hermes engine exclusively on iOS and Android — no web, desktop, JSC, V8, or legacy platform support

### Documentation
- Architecture-first approach with `docs/app_design_architecture.md`
- Always consult `docs/app_design_architecture.md` for the complete architectural context and implementation status

---

## Languages

### TypeScript
- **Apply to:** `src/**/*.ts,src/**/*.tsx`
- **Framework:** React Native (Expo) — Latest version only
- **Engine:** Hermes only — No support for JSC, V8, or web environments
- **State Management:** @legendapp/state — Observable-based reactive state
- **Build System:** Metro bundler with TypeScript support
- **Package Manager:** Bun with workspace configuration
- **Platform Support:** iOS and Android only

### Swift
- **Apply to:** `ios/**/*.swift`
- **Companion:** Kotlin for Android (isomorphic implementation)

### Kotlin
- **Apply to:** `android/**/*.kt`
- **Companion:** Swift for iOS (isomorphic implementation)

---

## Frameworks

### React Native (Expo)
- Latest version only, targeting iOS and Android exclusively
- No web, desktop, or legacy React Native versions

### SecureRecorder (Native Module)
**Zero-Trust Security Rules (CRITICAL)**

#### Encryption Standards (AES-256-GCM)
- **Algorithm:** AES-256-GCM (NoPadding)
- **Chunked Encryption:** Audio MUST be encrypted in independent chunks (~4-8KB)
- **IV/Nonce:** A unique 12-byte IV MUST be generated for *every* chunk
- **File Format:** `[4-byte length][12-byte IV][Encrypted Data + 16-byte Tag]`
- **Hardware Keys:** Keys must be stored in Keychain/AndroidKeyStore and accessible only after first unlock

#### Memory & Privacy Safety
- **No Unencrypted Disk I/O:** Flow is `Mic -> Encrypt Chunk -> Disk`. Never write raw PCM to a temp file
- **Inference Pattern:** Decrypt chunks in RAM → Reassemble/Stream → Pass to ONNX → Release memory immediately
- **Limits:** Max recording duration: 4 hours. Max file size: ~500MB

#### Isomorphic Implementation Strategy
The iOS (Swift) and Android (Kotlin) implementations MUST be structurally identical.

**Required Isomorphic Classes (One file per class):**
1. `SecureRecorderModule` (Main Entry)
2. `RecordingSession` (Orchestrator)
3. `AudioRecorder` (AVAudioEngine / AudioRecord)
4. `EncryptionStreamManager` (Writes chunked sealed boxes)
5. `StreamDecryptionManager` (Reads & decrypts to RAM)
6. `KeyManager` (Keychain / Keystore)
7. `PermissionManager`
8. `RecordingState` (Immutable State)

### ONNX Runtime
- Cross-platform neural network inference
- Model Framework: Sherpa-ONNX — Optimized audio processing pipelines

### Audio Models
- **VAD:** Silero VAD v5 (voice activity detection)
- **ASR:** Whisper Medium (speech recognition)
- **Speaker:** CAM++ (speaker recognition)
- **Pitch:** CREPE (fundamental frequency extraction)

### UI Components
- **Library:** React Native Paper (Material Design 3)
- **Icons:** Lucide Icons
- **Navigation:** React Navigation with type-safe routing
- **Localization:** typesafe-i18n with compile-time validation
- **Typography:** Material Design 3 type scale via `Text variant="..."`

---

## Tools

### Biome
- Unified toolchain for linting and formatting
- Enforces: formatting, naming, imports, visibility
- **Important:** Do not ignore errors flagged by Biome or ESLint. Fix styling, import, or typing issues before finalizing code
- **NO Terminal Formatting:** DO NOT run `bun run biome` or `bun run lint`. The user handles formatting locally via `Shift+Alt+S`

### Kysely
- Query builder for Expo SQLite
- Used for database schema and queries

### Vitest / Jest
- Vitest for unit tests
- Jest for native modules

---

## Standards

### Folder Structure (Domain-Driven)

| Folder | Purpose |
|--------|---------|
| **Api/** | Backend API client, HTTP transport, model resolution, generated types. Import from `@/Api` |
| **Components/** | Shared UI components (dumb, presentational) |
| **Context/** | React context providers |
| **Database/** | Persistence: entities, repository, decorators, serialization |
| **Entity/** | Domain entities (pure data + getters/setters; no I/O) |
| **Exception/** | Custom error types |
| **Localization/** | Locale, translations, `Localization`, `useLocalization` |
| **Navigation/** | Routing and screen types |
| **Security/** | Crypto, secure storage, vault, recovery kit, hardware gate |
| **Service/** | Capabilities (auth, biocode, voice calibration, etc.). No `*Service` suffix |
| **State/** | ViewModels / observable state |
| **Screen/** | Screen components (one per route; dumb, render state + bind events) |
| **theme/** | Colors, semantic status |

- No top-level `utils` or `i18n`. Logic lives in classes; localization in `Localization/`
- Dependency direction: `Screen → State → Service → Entity → Exception`
- Never import from a file directly if a domain barrel exists (`@/Service`, `@/Entity`, etc.)
- **Generated code under `src/Api/generated/` is exempt.** All wrapper/application code must comply.

### Class Structure

- **One Class Per File:** Filename must match class name exactly
  - Constants, enums, interfaces, and module-level exports are ALLOWED in the same file
  - DO NOT move constants/exports to separate files unless they are themselves classes
- **No "Utils" / Standalone Functions:** Logic belongs to a class (Service or Entity)
- **Service Naming:** Use capability names (e.g. `VoiceCalibration`), NEVER append `*Service`
- **Dependency Injection:** Inject via constructor using Interfaces/Types. Never instantiate inside a class
- **No Object Literals in Classes:** Use a `const INITIAL_STATE` or static factory instead
- **No standalone `const` object literals as module-level exports**
  - NEVER: `export const Schema = { ... } as const`
  - ALWAYS: `export class Schema { public static readonly ... }`

### Member Ordering

- **Properties:** Static first, then Instance. Within each: `public → protected → private`, then alphabetically
- **Constructor / Initializers**
- **Methods:** `public → protected → private`, then alphabetically. Getters/Setters are methods
- **One property per statement**

### MVVM / Logic Separation

- **Screen (View):** Dumb components. Render `state$` and bind events only. NO business logic
- **State (ViewModel):** Pure TypeScript classes with `observable` state and methods. No `useState`/`useEffect` for business logic
- **Service:** Stateless classes handling I/O, API, or complex calculations

### React Component Standards

- Typing: Use `interface Props`. Return `React.JSX.Element`. Avoid `React.FC`
- Wrap any component reading Legend-State with `observer()`

### Naming Conventions

| Target | Convention | Example |
|--------|------------|---------|
| Classes, Interfaces, Types | PascalCase | `ConsoleLogger`, `UserRepositoryInterface` |
| Methods, Variables, Params | camelCase | `getUserById`, `primaryKeyColumnName` |
| Primitive constants | SCREAMING_SNAKE_CASE | `MAX_LENGTH`, `PASSWORD_MIN_LENGTH` |
| Singleton instances | `Container.camelCase` | `Container.logger`, `Container.recoveryKit` |
| Enum members | PascalCase | `RecorderState.Recording` |
| Abstract Classes | `Abstract` prefix | `AbstractEntity` |
| Exceptions | `Exception` suffix | `ValidationException` |
| Private backing fields | `_camelCase` | `_state` (behind `get state()`) |
| Generic types | `TName` | `TEntity`, `TId` |

- No abbreviations (`pk`, `fk`). Use full words. Exceptions: `id`, `uid`
- Do not repeat the folder name in identifiers (e.g. in `Entity/`, use `primaryKey` not `entityPrimaryKey`)

### Logging

- Use `AppLogger` instance via DI
- No timestamps. The logger handles `dateFormat: 'time'`. Never add `new Date()`
- No PII in logs. Log only relevant identifiers/state

### Service Container

All runtime singleton instances live in `src/Container.ts` as static properties of the `Container` class:

- **Access:** `Container.logger`, `Container.recoveryKit`, etc.
- **No `export const` singletons:** Never export a singleton as a module-level `const`. Use Container
- **Primitive constants stay in domain files:** `MAX_LENGTH`, `PASSWORD_MIN_LENGTH`, etc. remain as `CONSTANT_CASE` in their own files
- **Constructor injection preferred:** For testability, classes should receive dependencies via constructor params
- **No methods on Container:** It is a passive holder. No `init()`, no `dispose()`, no factories
- **Property naming:** camelCase, no prefixes. `logger` not `appLogger`

### Documentation

- **No JSDoc** for self-explanatory methods, constructors, or properties
- Use JSDoc **only** for: class-level purpose, complex business logic, `@throws`, public API boundaries
- Prefer **self-documenting code** over comments
- Exception messages should be clear and descriptive

### Backwards Compatibility & Deprecations

**Do not implement backward-compatibility layers until the code is ready for release.** During development you are free to rename APIs and refactor callers without leaving aliases or guard clauses behind.

---

## Security

### Audio Encryption
- AES-256-GCM chunked encryption (native)
- Chunked format: `[Size 4B][IV 12B][Ciphertext + Tag]` per block

### Key Storage
- Hardware-backed Keychain (iOS) / AndroidKeyStore (Android)

### Biocode Protocol
- `Hash(SpeakerVector + TherapistIdentifier_Salt)`

### Anonymization
- 3-layer approach: ONNX BERT + Heuristics + Temporal Fuzzing

---

## Data & Storage

### Primary Database
- Expo SQLite with Kysely query builder

### File Storage
- Expo FileSystem for encrypted audio (.enc files)

### Preferences
- Expo SecureStore for sensitive configuration

### Schema
- Domain-driven entities: Encounter, Transcription, ProsodyMetrics, etc.

### Time Unit
- Integer milliseconds for all durations and timestamps