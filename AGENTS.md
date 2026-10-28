# Tiro Scribe

---

## AI Assistant Workflow

### Language

All agent output addressed to the user is **French** — chat, explanations, questions, plans, summaries, documentation, README, commit messages, branch names. Never produce English prose for the user. Code identifiers and comments follow the existing codebase conventions (English). User-facing product strings go through `Localization/` (en/fr), never hardcoded.

### Delivery boundary — human in the loop (critical)

The agent **never sends code and never deploys by itself**, and this generalizes to **every outbound action**: anything that leaves the local workspace or mutates an external system — `git commit` / `push` / `merge`, posting comments or approvals, publishing artifacts — requires an explicit, per-action "go" from the user in the current conversation. The agent prepares, explains, and proposes; **the user executes the decision**. A past authorization never carries over. Purely read-only inspection (`git status`, `git log`, `git diff`, `git show`, `git blame`) never requires approval.

### Git

Never run mutating git commands (`commit`, `push`, `pull`, `branch`, `stash`, `merge`, `rebase`, `tag`) unless the user explicitly asks for that exact operation in the current conversation. Read-only inspection is allowed and must use `--no-pager`.

### Terminal

Never append `| tail`, `| head`, or other output-truncation modifiers to terminal commands — execute them raw so output streams to the UI.

### MCP Tools (Zero-Hallucination Policy)

You have access to MCP servers. Use them proactively:

- **Context7:** ALWAYS use this tool to read the latest official documentation for `expo`, `expo-router`, `react-native`, `react-native-paper`, `onnxruntime-react-native`, `@mikro-orm/core`, `@legendapp/state`, and `zod` before using their APIs to prevent hallucinations
- **Sequential Thinking:** Use this tool to break down complex architectural changes or MVVM refactoring before writing the code

### Device & UI Debugging (Argent MCP)

Argent MCP is installed (global `@swmansion/argent`) and exposes live device tools: `list-devices`, `boot-device`, `launch-app`, `describe`, `screenshot`, `gesture-tap`, `gesture-swipe`, `keyboard`, `await-ui-element`, plus `debugger-*` (Metro/React tree, logs), `view-network-logs` and the `react-profiler-*` / `native-profiler-*` suites.

- **Skills first:** detailed guides live in `.agents/skills/argent-*` (setup, device interaction, iOS, TV, e2e, profiling, screenshot diff). Read the matching skill before any device interaction
- **Boot through Argent:** start devices with `boot-device` (AVD: `Pixel_7`), never manually — a manually booted emulator is invisible to Argent. Android package: `com.tiroscribe.app`
- **UX/UI debugging loop:** the user names a screen → agent navigates itself (`launch-app`, `gesture-tap`), captures evidence (`screenshot` + `describe` accessibility tree with tap coordinates), and audits against Material Design 3, touch targets (48dp), and contrast — cross-referencing `Screen/`, `State/` and `theme/` source code
- The Android 16 KB compatibility dialog at launch is dev-only; dismiss it ("Don't Show Again")

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
- **NO secrets or cryptographic material in logs** — keys, tokens, IVs, signatures stay out
- **NO hardcoded paths** — resolve from config (`AppConfig`) or environment

### Code Structure

- **NO Utils folders** — Logic belongs to classes (Service or Entity)
- **NO standalone functions** — All logic in classes
- **NO Built-in Errors** — Always use custom exceptions with descriptive messages inherited from The project exception base class or the Domain-specific exception base class (e.g., `RecordingException`, `ValidationException`, etc.)
- **NO `*Service` suffix** — Use capability names (e.g., `VoiceCalibration`)
- **NO object literals in classes** — Use `const INITIAL_STATE` or static factory
- **NO `export const` singletons** — Use `Container.camelCase` pattern
- **NO methods on Container** — Passive holder only; no `init()`, `dispose()`, factories
- **NO `useState`/`useEffect` for business logic** — Use Legend-State observables in State classes
- **NO module-level constants** — Every domain constant (including primitives) lives on the class that owns it as a `public static readonly` member (e.g. `AudioSegment.SAMPLES_PER_MS`), never as a free-floating module-level `const`. A constant describing a type lives as a static member of that type. Only wiring (clients, config, instantiation) is allowed at module scope in entrypoints
- **NO tuple returns** — Multiple return values become a named class/interface with one field per value, never a bare `[a, b]`
- **NO inline imports** — All `import` statements at the top of the file, never inside a function body (dynamic `import()` only with strong, explicit justification)
- **NO all-optional types** — A shape where every property is optional describes no real state; use state classes with real fields built by a static factory validated with Zod at the boundary

### React & TypeScript

- **NO React.FC** — Use `interface Props` and return `React.JSX.Element`
- **NO abbreviations** (`pk`, `fk`) — Full words only. Exceptions: `id`, `uid`
- **NO JSDoc for simple methods** — Self-documenting code preferred
- **NO hand-written `interface`/`type` for untrusted payloads** — Define a Zod schema and infer (`z.infer<typeof Schema>`): API responses, form input, any external JSON. Trusted internal domain data uses classes with `readonly` fields + static factory, never bare `type`/`interface` aliases

### Tooling & Formatting

- **NO terminal formatting** — DO NOT run `pnpm run biome` or `pnpm run lint`. User handles formatting via `Shift+Alt+S`
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
- **Package Manager:** pnpm with workspace configuration
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
- **Chunked Encryption:** Audio MUST be encrypted in independent chunks (~16KB, `EncryptionStream` buffers plaintext to 16 KB before sealing)
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
2. `Session` (Orchestrator)
3. `AudioRecorder` (AVAudioEngine / AudioRecord)
4. `EncryptionStream` (Writes chunked sealed boxes)
5. `StreamDecryptionManager` (Reads & decrypts to RAM)
6. `KeyManager` (Keychain / Keystore)
7. `PermissionManager`
8. `RecorderState` (Immutable State)

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
- **Navigation:** expo-router (file-based, `app/`) — `src/Navigation/` is legacy React Navigation and must not be extended
- **Localization:** typesafe-i18n with compile-time validation
- **Typography:** Material Design 3 type scale via `Text variant="..."`

---

## Tools

### Biome
- Unified toolchain for linting and formatting
- Enforces: formatting, naming, imports, visibility
- **Line width: 120 columns** (`lineWidth: 120`), never format or wrap at 80
- **Important:** Do not ignore errors flagged by Biome or ESLint. Fix styling, import, or typing issues before finalizing code
- **NO Terminal Formatting:** DO NOT run `pnpm run biome` or `pnpm run lint`. The user handles formatting locally via `Shift+Alt+S`

### MikroORM
- ORM over Expo SQLite (kysely-expo dialect), Doctrine-style: Data Mapper, Unit of Work, Identity Map
- Entities declared with `defineEntity`; rich domain classes `export class X extends XSchema.class`
- Bootstrap once at app start: `Database.initialize({ entities: ENTITY_CLASSES })` — access via `Database.getEntityManager().getRepository(X)`
- One repository per aggregate root (`src/Repository/`); base `AbstractRepository` provides `persist` (upsert), `exists`, `delete`
- Schema sync is additive at launch (`orm.schema.update()`) — no destructive migration

### Jest
- Jest (jest-expo) for TypeScript unit tests, Jest for native modules
- **Every public method has a test.** A public method without a test is a bug in the test suite, not an acceptable gap
- **1 `if` = 1 test:** each branch of a conditional gets its own test with its own assertion — a happy path plus one assertion does not cover an `if`
- **Error paths are behavior:** `catch` blocks, fallbacks, and guard clauses each get a test proving the failure is handled as intended

---

## Standards

### Folder Structure (Domain-Driven)

| Folder | Purpose |
|--------|---------|
| **Api/** | Backend API client, HTTP transport, model resolution, generated types. Import from `@/Api` |
| **Components/** | Shared UI components (dumb, presentational) |
| **Context/** | React context providers |
| **Database/** | Persistence bootstrap: MikroORM singleton, Dayjs mapping |
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
- **No pattern-speak in class names:** never suffix a class with `Gateway`, `Resolver`, `Handler`, `Manager`, `Wrapper`, or similar organizational labels — name the capability it performs
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
- **Blank line before the final return:** when a function body ends with a `return` preceded by other statements, insert a blank line before it (where possible)

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
- **No plurals in type names:** a type grouping several things takes a singular role name (`Bootstrap`, never `RuntimeAssets`). Same for directories: `Tool/`, never `Tools/`
- **Booleans read like sentences:** prefix boolean values with `is`/`has` (`isComplete`, `hasOverrides`)
- **Getters carry the verb:** a value getter reads `getExpiresAt()`, never `expiresAt()`; boolean predicates stay `is*`/`has*`
- **Method verbs describe the real contract:** no generic domain verbs — name the destination and the purpose (`fillUntilDelimiter`, not `readNext`). A callee never borrows the caller's vocabulary

### Logging

- Use `AppLogger` instance via DI
- No timestamps. The logger handles `dateFormat: 'time'`. Never add `new Date()`
- No PII in logs. Log only relevant identifiers/state

### Service Container

All runtime singleton instances live in `src/Core/Container.ts`, registered as class-keyed factories:

- **Access:** `Container.get(AudioFileEncryptor)` — classes register themselves at the bottom of their file (`Container.register(X, () => new X(...))`)
- **No `export const` singletons:** Never export a singleton as a module-level `const`. Use Container
- **Constants live on their owning class** as `public static readonly` members (`AudioSegment.SAMPLES_PER_MS`) — not in domain files as free `CONSTANT_CASE`, and never on `Container`
- **Constructor injection preferred:** For testability, classes should receive dependencies via constructor params
- **No methods on Container:** It is a passive holder. Registration side effects only, in the classes' own files
- **Property naming:** camelCase, no prefixes. `logger` not `appLogger`

### Documentation

- **No JSDoc** for self-explanatory methods, constructors, or properties
- Use JSDoc **only** for: class-level purpose, complex business logic, `@throws`, public API boundaries
- Prefer **self-documenting code** over comments
- **Concise comments:** a comment is ONE short line, never a paragraph. If it needs more, the code is not decomposed enough — extract a method or a variable with a name that says it. No narrative, no restating what the code does line by line, no multi-line essays
- **A large block of comments signals poor decomposition:** extract a named method instead of commenting further — a good name replaces the explanation. Legitimate comments: `// SAFETY:`, pedagogical `// TODO`, formal JSDoc, and non-obvious invariants (1-2 lines)
- Exception messages should be clear and descriptive

### Repository & Persistence (Doctrine-style)

- **Rich entities:** derived behavior lives on entities (`isActive()`, `getCostUsd()`-style getters), not in query classes or free functions
- **One repository per aggregate root:** a repository covers an aggregate and its graph (`Encounter` → transcriptions, prosody metrics), not a table. Only the owning repository touches the database for its aggregate
- **Named classes over anonymous shapes:** no bare `type`/`interface` aliases for domain data, no positional-argument constructor bursts — named classes, `readonly` fields, static factories

---

## Security

### Audio Encryption
- AES-256-GCM chunked encryption (native)
- Chunked format: `[Size 4B][IV 12B][Ciphertext + Tag]` per block

### Key Storage
- Hardware-backed Keychain (iOS) / AndroidKeyStore (Android)

### Biocode Protocol
- **Projection vectorielle** (décision 28/10/2026, remplace `Hash(SpeakerVector + Salt)`) : `Biocode = ProjectionMatrix × SpeakerVector`, matrice dérivée du secret thérapeute (`ProjectionMatrixFactory` via master key)
- Matching multi-séances par similarité cosinus (`Biocode.similarityTo`) ; anonymisation préservée — sans la matrice, le biocode n'est pas ré-identifiable

### Anonymization
- 3-layer approach: ONNX BERT + Heuristics + Temporal Fuzzing

---

## Data & Storage

### Primary Database
- Expo SQLite via MikroORM v7 (kysely-expo dialect)

### File Storage
- Expo FileSystem for encrypted audio (.dat files, EncryptionStream format)

### Preferences
- Expo SecureStore for sensitive configuration

### Schema
- Domain-driven entities: Encounter, Transcription, ProsodyMetrics, etc.

### Time Unit
- Integer milliseconds for all durations and timestamps
