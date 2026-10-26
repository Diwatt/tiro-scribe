# Tiro Scribe — Realistic Encounter Seeding Plan

## Goal

Populate the local database with **6 realistic therapy encounters** (2 patients × 3 sessions) that reach the `ToProcess` stage with **real encrypted audio files**, a **genuine therapist biocode**, and **realistic transcriptions/prosody** so the local inference pipeline (VAD → ASR → Speaker Diarization) can be exercised end-to-end.

---

## Why This Is Hard

| Constraint | Implication |
|-----------|-------------|
| `SecureRecorder` uses AES-256-GCM chunked encryption | Cannot pre-generate `.enc` files outside the app |
| Keys live in Keychain / AndroidKeyStore | Hardware-bound, not extractable |
| Chunk format: `[4B size][12B IV][ciphertext+tag]` | Must go through native module |
| Biocode = projected speaker vector via CAM++ | Requires real audio + ONNX inference to generate |

**Conclusion:** We must **record real audio through the app** to create valid encrypted files and a legitimate therapist biocode.

---

## Two-Phase Strategy

### Phase 1: Dev Therapist Setup (One-Time)

**Objective:** Create a dev therapist with a real biocode via actual voice calibration.

**Flow:**
1. Run app in dev mode
2. Trigger hidden dev gesture → `DevSeedCoordinator.startTherapistOnboarding()`
3. Use `TherapistForge.create()` with test credentials
4. Persist therapist via `Registry.getRepository(Therapist).persist()`
5. Store master key in `MasterKeyVault`
6. Run `VoiceCalibrator.captureVoiceSample()` + `generateBiocode()` using the real microphone
7. Save projected biocode to therapist entity

**Result:** One `Therapist` row with a **real, cryptographically valid biocode** derived from actual audio.

---

### Phase 2: Encounter Recording (Per Encounter)

**Objective:** Create 6 encounters with real encrypted audio containing distinguishable speakers (therapist vs. patient).

**Audio Source Strategy:**

Since we need real audio but cannot ship copyrighted material, we have two options:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Synthetic Speech** | Use TTS (macOS `say`, Google TTS, or Coqui) to generate therapy dialogue with two distinct voices | Fully legal, reproducible, deterministic speaker separation | Slightly synthetic-sounding |
| **B. Playback Loop** | Play pre-recorded audio files (TV show dialogue, podcast, Creative Commons therapy sessions) through speakers while `SecureRecorder` captures | Most realistic, natural prosody | Copyright risk unless carefully sourced; harder to guarantee speaker separation |

**Recommended: Option A (Synthetic Speech)**

Generate two voice profiles:
- **Therapist voice:** Lower pitch (~120Hz), steady pace, calm prosody
- **Patient voice:** Higher pitch (~180Hz), more variable, hesitant patterns

**Recording Flow (per encounter):**

```
1. Dev trigger → "Record Seed Encounter"
2. App plays therapist audio through speaker (or headphones + mic bleed)
3. Simultaneously: SecureRecorder.start(sessionId) captures from microphone
4. Pause between speakers if needed for cleaner diarization
5. SecureRecorder.stop() → writes encrypted .enc file
6. Create Encounter entity with encryptedAudioPaths = [filePath]
7. Create Patient entity with biocode = null (will be filled by pipeline)
8. Create QueueItem for pipeline processing
9. Set Encounter.status = ToProcess
```

**Result per encounter:**
- One `.enc` file on disk (valid AES-256-GCM, decryptable by the app)
- One `Encounter` row (status = `ToProcess`)
- One `Patient` row (biocode initially empty, filled by speaker recognition)
- One `QueueItem` row (pipelineStage = `Waiting`, status = `Pending`)

---

## Phase 3: Pipeline Processing (The Test)

Once seeded, the existing pipeline processes each encounter:

```
QueueItem (Waiting) → VAD → ASR (Whisper) → Speaker Diarization (CAM++) → Biocode Match
```

**Expected outcomes to validate:**
- Transcription entity created with `Utterance[]` and correct `speakerLabel`
- ProsodyMetrics entity created with `VoiceFrame[]`
- Patient biocode populated (matched against therapist biocode = non-match → new patient)
- Second encounter with same patient → biocode match → same patient UUID

---

## Data Model After Seeding

```
Therapist (1)
  ├── Encounter 1 ── Patient A ── QueueItem ── .enc file
  ├── Encounter 2 ── Patient A ── QueueItem ── .enc file
  ├── Encounter 3 ── Patient A ── QueueItem ── .enc file
  ├── Encounter 4 ── Patient B ── QueueItem ── .enc file
  ├── Encounter 5 ── Patient B ── QueueItem ── .enc file
  └── Encounter 6 ── Patient B ── QueueItem ── .enc file
```

All encounters: `status = ToProcess`, `isIncognito = false`
All queue items: `pipelineStage = Waiting`, `status = Pending`

---

## Files to Create

### Core Seeder

| File | Purpose |
|------|---------|
| `src/Dev/DevSeedCoordinator.ts` | Main orchestrator: onboarding + encounter recording |
| `src/Dev/SyntheticDialogueGenerator.ts` | Generates therapy dialogue text in French |
| `src/Dev/AudioPlaybackRecorder.ts` | Plays audio + drives SecureRecorder simultaneously |
| `src/Dev/DevSeedException.ts` | Custom exception for seeding errors |
| `src/Dev/index.ts` | Barrel export + dev trigger registration |

### Dev Trigger Integration

| File | Change |
|------|--------|
| `src/Screen/SettingsScreen.tsx` | Add hidden dev section (tap version 5×) with "Seed Data" button |
| `src/State/SettingsState.ts` | Add `triggerSeedData()` method |

### Bug Fix

| File | Change |
|------|--------|
| `src/Database/Registry.ts` | Add `export const registry = Container.get(Registry);` |

---

## Synthetic Dialogue Content (French)

### Patient A — "Sophie" (Anxiety / Panic)

**Session 1 (15 min):**
- Opening: sleep issues, racing thoughts
- Middle: first panic attack description (metro, physical symptoms)
- End: homework = thought diary

**Session 2 (30 min):**
- Opening: diary review, pattern recognition
- Middle: cognitive restructuring exercise on catastrophic thoughts
- End: breathing technique practice

**Session 3 (20 min):**
- Opening: progress report, fewer night wakings
- Middle: exposure hierarchy construction
- End: next week plan

### Patient B — "Marc" (Depression / Burnout)

**Session 1 (20 min):**
- Opening: fatigue, loss of interest
- Middle: work context, overload timeline
- End: PHQ-9 introduction

**Session 2 (35 min):**
- Opening: questionnaire review, score = 14
- Middle: behavioral activation, activity scheduling
- End: one pleasant activity commitment

**Session 3 (25 min):**
- Opening: activity done (walk), slight mood lift
- Middle: cognitive patterns (all-or-nothing thinking)
- End: sleep hygiene discussion

---

## Audio Generation Script (External)

Since the app cannot generate TTS natively, we pre-generate audio files:

```bash
# macOS say command example
say -v Thomas "Bonjour Sophie, comment vous sentez-vous depuis notre dernière séance ?" -o therapist_01.aiff
say -v Audrey "J'ai mieux dormi cette semaine, mais le métro reste difficile." -o patient_a_01.aiff

# Convert to 16kHz mono PCM (SecureRecorder format)
ffmpeg -i therapist_01.aiff -ar 16000 -ac 1 -f s16le therapist_01.pcm
ffmpeg -i patient_a_01.aiff -ar 16000 -ac 1 -f s16le patient_a_01.pcm
```

These PCM files are then **played back and re-recorded** through the app to create valid `.enc` files.

---

## Implementation Order

| Priority | Task | Rationale |
|----------|------|-----------|
| 1 | Fix `registry` export bug | Unblocks all repository access |
| 2 | Create `DevSeedException` | Error handling for seeding |
| 3 | Create `SyntheticDialogueGenerator` | Pure logic, no dependencies |
| 4 | Create `AudioPlaybackRecorder` | Bridges playback + SecureRecorder |
| 5 | Create `DevSeedCoordinator` | Orchestrates the full flow |
| 6 | Wire dev trigger in Settings | Expose to UI |
| 7 | Generate TTS audio externally | Pre-seed audio assets |
| 8 | Test end-to-end seeding | Validate pipeline |

---

## Open Questions

1. **TTS Voice Selection:** Which voices sound distinct enough for speaker separation? (Thomas vs. Audrey on macOS?)
2. **Speaker Separation Quality:** Will CAM++ reliably distinguish two synthetic voices from the same TTS engine?
3. **Audio Playback Method:** Speaker playback vs. wired audio loopback for cleaner separation?
4. **Incognito Encounters:** Do we seed any `isIncognito = true` encounters for bunker-mode testing?
5. **Duration Accuracy:** Should totalDuration match actual audio length exactly, or is approximate OK?
