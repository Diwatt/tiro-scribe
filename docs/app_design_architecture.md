# Tiro Scribe – Reference Architecture (v1.0)

Single source of truth for data capture, processing, and storage. Refer to `@archi_doc.md` before suggesting architectural changes.

---

## 1. Project philosophy

- **Never substitute for the therapist:** The app supports the clinician; it does not replace human judgment. We do **psychiatric computation** (measurable, algorithmic outputs from transcript and prosody), not “human” interpretation (e.g. sentiment as a product goal is out of scope—that’s marketing, not clinical support).
- **Local-first / Privacy-by-design:** No raw audio stream ever leaves the user's device.
- **Passive sensing (atomic metrics):** The app is a measurement tool; all statistical or clinical interpretations (averages, scores, trends) are computed server-side.
- **Traceability:** Every processing result is signed with algorithm/model metadata (`modelName`, `modelVersion`).

---

## 2. Audio specifications (the sensor)

Clinical high-fidelity (medical grade), not telecommunication comfort.

**Hardware (AudioConfig)**

| Platform | Setting |
|----------|--------|
| Sample rate | 16 000 Hz (voice / Whisper ASR standard) |
| Format | PCM 16-bit mono |
| Android | `AudioSource.UNPROCESSED` (no AGC, noise suppression, echo cancellation) |
| iOS | `.measurement` (no automatic signal processing / gain) |

**Processing pipeline (dual stream)**  
On each PCM buffer, two virtual paths:

- **DSP stream (measurement):** Instantaneous physical metrics (pitch, energy, voicing confidence).
- **ASR stream (transcription):** Buffer accumulation for local Whisper inference → text + timestamps.

**Status:** ✅ **Done** – `AudioConfig` (iOS/Android) 16 kHz mono; pipeline split is design. 🚧 **WIP** – DSP/ASR orchestration in TS.

---

## 3. Security & encryption (the vault)

- **Format:** `.enc` files, sequential streaming.
- **Algorithm:** AES-256-GCM.
- **Chunk layout:** `[Size 4B][IV 12B][Ciphertext + Tag]` per block.
- **Decryption:** `StreamDecryptionManager` (Android/iOS), block-by-block in RAM; no full-file accumulation.

**Status:** ✅ **Done** – EncryptionStream, StreamDecryptionManager (iOS/Kotlin), JS `DecryptionManager.stream(path)`.

---

## 4. Data schema (entities)

**Time (golden rule)**  
- **Unit:** Integer **milliseconds** for durations and timestamps (Utterance.startTime/endTime, VoiceFrame.startTime/duration, Encounter.totalDuration).  
- **Reference:** Relative to session start (`startTime = 0`).

**Core entities**

| Entity | Role |
|--------|------|
| **Encounter** | Session metadata, encrypted audio paths, `isIncognito`, therapist, duration (ms). |
| **Transcription** | One per encounter; holds `utterances: Utterance[]`, `modelName`, `modelVersion`. |
| **ProsodyMetrics** | One per encounter; holds `voiceFrames: VoiceFrame[]`, `modelName`, `modelVersion`. Used everywhere for analysis. |
| **Patient** | Per-encounter participant; `biocode`, `serverPatientUuid`; no names. |
| **QueueItem** | Per-file job; `filePath`, `processingOffset` (bytes) for resumable processing. |

**Atomic types**

| Class | Properties | Description |
|-------|------------|-------------|
| **Utterance** | `id`, `startTime`, `endTime`, `text`, `speakerLabel`, `confidence` | One speech unit (raw ASR). |
| **VoiceFrame** | `startTime`, `duration`, `pitch`, `energy`, `spectralTilt`, `periodicity`, `segmentId?` | One physical measurement frame. |

**Naming:** Use **Utterance** (not Segment/Sentence), **VoiceFrame** (not DataPoint/ProsodyPoint), **Redaction** (not AnonymizedEntity). Property names match contained types (`utterances`, `voiceFrames`).

**Note:** `jitter`, `shimmer`, `speakingRate` are **not** stored; they are derived server-side. Prosody metrics (VoiceFrame time-series) are the canonical input for analysis everywhere (client and server).

**Status:** ✅ **Done** – Encounter, Transcription, ProsodyMetrics, Patient, QueueItem, Utterance, VoiceFrame, DetectedSpeakerProfile in Type.ts; `processingOffset` on QueueItem.

---

## 5. Operating modes: Standard vs Incognito

| Feature | Standard (Clinical) | Incognito (Bunker) |
|--------|----------------------|---------------------|
| **Philosophy** | Security & science | Zero trace |
| **Audio** | 100% local (VAD, prosody, ASR). Only server option: advanced anonymization on transcript (non-incognito). | 100% local (edge AI); nothing leaves device |
| **Anonymization** | Smart (NER); mask identities, keep context | Aggressive (NER + POS); mask all proper nouns |
| **Cloud storage** | Anonymized readable JSON | Encrypted blob; only user key can decrypt |
| **Local DB** | Smart cache for search/offline | Single source of truth; only place data is readable |
| **Search (FTS)** | On anonymized text | On redacted “gapped” text |
| **Prosody** | Prosody metrics used everywhere for analysis (pitch, jitter, speed; anonymous) | Same; voice signature projected (hash) |
| **Discourse** | Psychiatric computation (themes, syntax, structure); no sentiment/substitution for therapist | Same scope; limited payload in Incognito |
| **Backup** | Full restore from cloud | Hard; lose key/device → data lost (unless blob backup) |

**Incognito UX:** Toggle on recording screen: default “Research” (🧬), alternate “Incognito” (🔒). Visual feedback (e.g. dark theme) when Incognito is on.  
**Incognito flow:** On device: transcribe → encrypt (AES-256, key from therapist password) → destroy raw audio. Cloud receives only opaque blob; server is blind.  
**Status:** ✅ **Done** – `Encounter.isIncognito`; UX and full flow 🚧 **WIP**.

---

## 6. Native module & processing pattern

**Global:** “Store now, process later” – light live recording → deferred AI on charger.  
**Stack:** Expo modules (Kotlin/Swift), React Native, ONNX.

**Sensor implementation:** The `secure-recorder` native module implements this section (capture format, encryption, decryption, limits). The contract is declared here and in the module README (`Reference architecture (mandatory for AI)`); changes to format or limits must keep both aligned.

**Double buffering (I/O & bridge)**  
- **Record (EncryptionStream):** Accumulate raw audio in RAM up to 16 KB → encrypt (AES-GCM) and write when buffer full.  
- **Read (StreamDecryptionManager):** Accumulate decrypted blocks in native RAM up to ~512 KB (~16 s) → one `onChunkLoaded` event to JS.

**AI engine (JS / ONNX)**  
- **Pattern:** Doc describes “Pull” (JS calls `readChunkAt(offset)`, native responds by event).  
- **Current API:** `stream(encryptedPath)` + events; no `readChunkAt(offset)` in JS or native.  
- **Models:** VAD (e.g. Silero), ASR (e.g. whisper_small_int8), Speaker (CAM++), Pitch (CREPE).  
- **Segmentation:** Rolling buffer; if duration > 2 s and VAD silence → cut & process; hard cap 28 s (Whisper).

**Status:** ✅ **Done** – EncryptionStream, StreamDecryptionManager, `stream(path)` + listeners. 🚧 **WIP** – Pull-style orchestrator and ONNX integration. ⚠️ **Incoherent** – Doc says `readChunkAt(offset)`; implementation is event-driven `stream(path)`.

---

## 7. AI / Cursor rules (summary)

- **Time:** Use integer milliseconds for duration/timestamp (once codebase is aligned).
- **Audio:** Assume UNPROCESSED/RAW; do not add AGC, filters, or noise reduction.
- **Boilerplate:** Prefer compact classes (e.g. in Type.ts) to limit sprawl.
- **Context:** Refer to `@archi_doc.md` for data flow and schema.

---

## 8. Roadmap & implementation status

### Phase 1 – Model assets

| Task | Status |
|------|--------|
| Silero VAD v5 (`silero_vad.onnx`) | 🚧 WIP – ModelDownloader from API; exact asset TBD |
| Whisper Medium (e.g. int8, ~500–800 MB) | 🚧 WIP – Config-driven; small currently referenced |
| Speaker: CAM++ (e.g. 512-d) | 🚧 WIP – chosen for speaker recognition |
| Pitch f0: CREPE | 🚧 WIP – chosen for pitch extraction |

### Phase 2 – DSP utilities (e.g. AudioUtils)

| Task | Status |
|------|--------|
| `pcm16ToFloat32` (lossless) | ❌ Not started |
| EBU R128 normalization (transcript only) | ❌ Not started |

**Note:** Micro-prosody (jitter, shimmer, HNR) is derived **server-side** from VoiceFrame time-series; not implemented in the app.

### Phase 3 – Inference engine (e.g. OfflineTranscriber)

| Task | Status |
|------|--------|
| ONNX graph optimizations / NPU | ❌ Not started |
| Biocode projection (speaker vector → practitioner key) | 🚧 WIP – Biocode service exists |
| Multi-pass: diarization/VAD → word-level Whisper → acoustic sync | 🚧 WIP – AudioProcessing pipeline; full multi-pass not done |
| Formants (F1, F2) / vowel space | ❌ Not started |

**Comments (Phase 3):**
- **Multi-pass:** (1) Run VAD and/or diarization to get segments (who speaks when). (2) Run Whisper per segment for word-level timestamps. (3) Acoustic sync: align transcript words with prosody frames (VoiceFrame) on the same time base so server can compute metrics per word or per utterance.
- **Formants (F1, F2) / vowel space:** Spectral peaks of the vocal tract (vowel quality). Vowel space (e.g. F1–F2 plot) is a research/clinical descriptor; would be derived from audio (or from prosody pipeline), likely server-side. Not in app scope yet.

### Phase 4 – Deep data output & checkpointing

| Task | Status |
|------|--------|
| High-density result type (e.g. HighResTranscription with `clinical_metrics`, `words`) | ❌ Not started |
| Checkpoint per segment in SQLite for resume | 🚧 WIP – `QueueItem.processingOffset` supports resume; segment-level checkpoint TBD |

### Vigilance

- Whisper hallucinations (VAD should trim long silences).
- Raw speaker embedding must be overwritten after biocode projection; no biometrics on disk.
- Acoustic analysis windows aligned with Whisper timestamps.

---

## 9. Company & product context (Tiro)

- **Vision:** “Verify, don’t trust” – digital institution, not classic SaaS.  
- **Mission:** Best clinical tool for therapists + largest anonymized dataset for mental health research.  
- **Legal:** SCIC (cooperative); anti-acquisition lock; multi-stakeholder governance (employees, scientists, users).  
- **Tech:** Audio and identity never leave the device; NER + encryption; cloud gets only anonymized/metadata.  
- **Business:** Productivity tool (≈49–69 €/month); subscriptions fund infra and research dataset; break-even ~200–300 subscribers.

**Launch roadmap:** Alpha science (committee, NER validation) → SCIC creation → Commercial (month 6).

---

## 10. Implementation status summary

| Area | Status | Notes |
|------|--------|-------|
| Philosophy & principles | ✅ Done | Documented and reflected in design |
| AudioConfig 16 kHz raw | ✅ Done | iOS/Android |
| AES-256-GCM chunked encryption | ✅ Done | EncryptionStream, StreamDecryptionManager |
| Entities (Encounter, Transcription, ProsodyMetrics, Patient, QueueItem) | ✅ Done | Utterance, VoiceFrame, DetectedSpeakerProfile |
| QueueItem resumable (processingOffset) | ✅ Done | |
| Incognito flag (Encounter.isIncognito) | ✅ Done | |
| Decryption API (stream + events) | ✅ Done | No readChunkAt(offset) |
| Time units (ms) | ✅ Done | Utterance, VoiceFrame, Encounter.totalDuration all in milliseconds |
| VoiceFrame naming (startTime, periodicity) | ✅ Done | Doc and code aligned |
| Pull-mode orchestrator (readChunkAt) | ⚠️ Incoherent | Doc describes pull; API is push/events |
| ONNX pipeline (VAD, ASR, Speaker) | 🚧 WIP | ModelDownloader, AudioProcessing; full pipeline in progress |
| High-fidelity models (Whisper Medium, CREPE pitch, CAM++ speaker) | 🚧 WIP | CREPE and CAM++ chosen; config-driven rollout |
| DSP (client: pcm16ToFloat32, EBU R128 transcript only; jitter/shimmer/HNR server-side) | ❌ Not started | Micro-prosody derived server-side from prosody metrics |
| HighResTranscription & segment checkpointing | ❌ Not started | |

---

**External:** [Spreadsheet link](https://docs.google.com/spreadsheets/d/1eOSiy02ZCEH_fV4tQDywnhucfRn-o37jRnk4xZGJwVo/edit?gid=0#gid=0)
