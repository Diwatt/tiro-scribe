# TODO — Tiro Scribe : plan de développement

> **Fusion du 27/10/2026** (`PROJECT.md` + `KEEP.md`) **puis audit complet du code le 27/10/2026** sur HEAD `1e213d8` : chaque affirmation a été revérifiée (type-check, tests, greps, lectures de code). Les items marqués 🔎 ont été constatés lors de l'audit ; les corrections par rapport aux notes d'origine sont signalées.
>
> **Sources de vérité compagnes :**
> - Architecture (design, entités, statuts ✅/🚧/❌) : `docs/app_design_architecture.md`
> - Build : `docs/build-and-compilation-guide.md`
>
> **Règle de livraison (critique) :** l'agent prépare, l'utilisateur exécute. Aucun commit/push/action sortante sans « go » explicite dans la conversation courante.
>
> **Mode d'emploi :** implémenter phase par phase, dans l'ordre. Les arbitrages non tranchés sont marqués **[ARBITRAGE]** — ne pas coder au-delà sans décision.

---

## 0. État de départ *(audit 27/10/2026)*

Enregistreur clinique chiffré **fonctionnel jusqu'au disque** : onboarding complet (compte, calibrage voix → biocode CAM++, recovery kit), téléchargement de modèles, enregistrement AES-256-GCM + `Encounter` persisté (`ToProcess`). **Après `stop()`, plus rien** : l'ASR est un stub — blocage central, à attaquer **après** le spike runtime (P2).

🔎 **Santé vérifiée au 27/10/2026 :**
- Tests : **628 passés / 649** (55 suites ✅, 2 skipped, 21 tests skipped)
- Type-check : **45 erreurs** tsc (revalidé au 27/10 après Vague C ; 6 dans `src/`, le reste = dette `tests/` — détail en P7)
- `pnpm outdated` : drift modéré, rien de bloquant ; majors disponibles : lucide 1.x, uuid 14, RNTL 14, Babel 8, msw 3 (table complète en P6)
- Working tree non committé : suppression `SEED`/`STATE`/`TECH`, fix snackbar `AudioFileEncryptor` + 2 tests DevConsole, commentaire `babel.config.js`, ce `TODO.md`
- Déjà commité hier/aujourd'hui (corrige les anciennes notes) : session `encryptBytes` (Kotlin+Swift+TS), **casse `src/api` → `src/Api` corrigée**, **quick-crypto 1.1.9** + quick-base64 3.x + nitro-modules, CI (pnpm-lock committé, setup-android retiré)

🔎 **Infra d'inférence réellement existante** (plus avancée que les anciennes notes ne le disaient) :
- `InferenceModel/` : `Runtime` (sessions ONNX, **single-session**, CPU seul), `Setup` (`CAPABILITIES = ['vad','asr','pitch','speaker_id']`, sélection **par langue**), `ConfigProvider`
- `InferenceModel/Download/` **complet** : `Downloader`, `DownloadTaskManager`, `DownloadTaskExecutor`, `ExecutorCollection`, `FileDownloader`, `ModelArtifactStorage`, `ChecksumVerifier` + entité `DownloadQueue`/repo + `WifiVerifier` + `SystemVerifier` → le « gestionnaire de modèles » du KEEP **existe déjà** (à corriger/auditer, pas à créer)
- `Security/HardwareGuard` + `DeviceCompatibilityGate` (OS semver, RAM, arch 64-bit, deviceType) + **route `app/incompatible.tsx`** + `DeviceIncompatibleScreen` → le « gatekeeper » du KEEP **existe déjà**
- `Repository/` : `EncounterRepository`, `QueueItemRepository` (basique), `TherapistRepository`, `DownloadQueueRepository`

🔎 **Ce qui manque toujours cruellement** : ASR (`AutomaticSpeechRecognizer.run()` → `'TODO: implement full transcription pipeline'`, tokenizer non parsé, config Whisper hardcodée), VAD/Pitch (`Setup` les déclare, `Runtime.createModel` les rejette), tout consommateur de `QueueItem` après `stop()`, anonymisation, écrans résultats réels.

**Stack** : RN 0.88.0 + Expo ~58.0.19 (expo-router, dev-client), Hermes V1 · `@legendapp/state` · Paper MD3 5.15 + Lucide · SQLite + MikroORM v7 (kysely-expo 0.29.6, sans patch) · `onnxruntime-react-native` 1.24.3 · quick-crypto 1.1.9 + module natif `secure-recorder` · pnpm · Jest 30 · Biome + ESLint (perfectionist) · typesafe-i18n (en/fr).

---

## 1. Décisions actées (contraignantes)

| Sujet | Décision (26/10/2026) |
|---|---|
| ~~ORM maison à décorateurs~~ | **Remplacé** par MikroORM v7 (`defineEntity`, vraies colonnes relationnelles, FTS5 retiré) — migration 2026-10-27. L'ancien couplage decorators ↔ Babel/Hermes n'existe plus |
| Lucide | **Conservé** — bump major 0.575 → 1.61 à faire (P6) |
| ESLint | **Conservé** uniquement pour l'ordre des membres (perfectionist) |
| Storybook / DevConsole + 5-taps | **Conservés** ; à exclure du bundle release avant distribution (P6) |
| Runtime IA | **ExecuTorch = direction par défaut**, à valider par le spike (P2). ONNX Runtime reste le dénominateur commun multi-modèles ; `Runtime` = seule interface vers le moteur (remplaçable) |
| Modèles (revue fin 2026) | **CAM++ conservé** (biocode) · **Silero VAD v5 conservé** · ASR : **Whisper Medium remis en cause** au profit de **Parakeet-TDT-0.6B-v3** (FR, timestamps mot natifs) → spike · Pitch : **CREPE remis en cause** (SwiftF0, ~42× plus rapide CPU) · NER : **pas de BERT maison** — évaluer OpenMed-PII-French / GLiNER-PII / `privacyFilter` (P5) |
| Métriques cliniques | Jitter, shimmer, HNR, formants F1/F2, VSA, indices (Fluency/Stability/Melodic/Timbral) = **server-side**, dérivés des `VoiceFrame` canoniques. L'app capture, elle n'interprète pas |
| Sources audio fixtures | Extraits de séries TV (TTS écarté) ; fixtures incognito = **non** pour l'instant ; `totalDuration` = durée exacte depuis les bytes PCM |
| Transfert fixtures | `adb push` + `run-as` dans le sandbox |

---

## 2. Règles opérationnelles critiques (pièges actifs)

| # | Piège | Règle |
|---|---|---|
| R1 | **Patch pnpm babel-preset** (`@react-native/babel-preset@0.85.3`, `&& !isHermes`) 🔎 toujours en place | Protège désormais le profil `hermes-stable` (classes natives Hermes) — la justification décorateurs a disparu avec MikroORM ; retrait du patch à ré-évaluer au prochain bump RN, validé par build. **Chaque bump RN le casse** → régénérer (`pnpm patch`). Ne jamais supprimer `pnpm-lock.yaml` |
| R1b | ✅ **Patch `kysely@0.28.17.patch` supprimé** | kysely 0.29.6 (requis par MikroORM v7) n'a plus besoin de patch |
| R2 | **Metro ne relit pas `babel.config.js` à chaud** | Après modif config Babel : `stop-metro` puis `pnpm exec expo start --dev-client --port 8081 --reset-cache` |
| R3 | **Plugin ONNX mute `node_modules`** 🔎 `plugins/withOnnxruntime.js` + `withGradleLimits.js` toujours actifs | Après **chaque** `pnpm install` : relancer `pnpx expo prebuild` **avant** de builder. Symptômes si oubli : `Could not get unknown property 'VersionNumber'` (Android), échec `SessionUtils.cpp` (iOS). Disparaîtra avec L2 (P6) |
| R4 | **Re-validation à chaque bump ORT/RN** | Diff contre tarball pristine (`npm pack onnxruntime-react-native@<v>`) sur podspec · `lib/binding.ts` · `android/build.gradle`, puis re-tester une inférence CAM++ réelle |
| R5 | ✅ **Getters d'entités `undefined` sur device** — résolu | Cause (class fields natifs Hermes écrasant les accessors décorés) disparue : plus aucun décorateur depuis la migration MikroORM |
| R9 | **Patch pnpm `@mikro-orm/core@7.2.5` + `@mikro-orm/sql@7.2.5`** 🔎 toujours en place | Metro rejette `import(<variable>)` et `import.meta.resolve` au transform : `scripts/patch-mikroorm.pl` neutralise les chemins dynamiques Node-only (tryImport, extensions seeder/migrator, fs-utils/metadataCache, folder-based discovery, attachDatabases, dataloader optionnel, dynamicImportProvider par défaut). **Chaque bump MikroORM le casse** → régénérer : `pnpm patch <pkg>` → `perl scripts/patch-mikroorm.pl <dir>` → `pnpm patch-commit <dir>` |
| R10 | **Build cache gradle → `.so` natif stale après un bump de module natif (Nitro)** | Symptôme : warning `Nitro runtime 0.35.6 vs JS 0.37.1` + `TypeError: undefined is not a function` dans quick-base64/quick-crypto. pnpm hoisted garde le MÊME chemin `node_modules/<pkg>` → le build cache gradle ne détecte pas le changement de contenu et ressert le `.so` d'un build antérieur. Fix : `android/gradlew clean` + `org.gradle.caching=false` (actuellement en place) puis rebuild. Réactiver le cache seulement après un build natif propre vérifié |
| R6 | **DevConsole** | UI : préfixe `file://` obligatoire (expo-file-system exige une URI) ; natif : chemin POSIX **sans** `file://` ; DB reset au boot dev → charger une fixture exige un thérapeute persisté (`THERAPIST_NOT_FOUND`) |
| R7 | **Versions flottantes ONNX Android** | 3 AAR `latest.integration` non épinglés → builds non reproductibles. À épingler (P6, L2) |
| R8 | **16 KB page size (Android 15/16)** | AAR Microsoft non alignés → **bloquant Google Play** avant distribution. Vérifier variants 16 KB, épingler, `check-elf-alignment` (P6) |

**Recettes :**

```bash
# Fixtures : conversion + transfert (build debug, sans rebuild)
ffmpeg -i episode_scene.mkv -ar 16000 -ac 1 scene_01.wav   # ou -f s16le → .pcm
adb push scene_01.wav /data/local/tmp/
adb shell run-as com.tiroscribe.app cp /data/local/tmp/scene_01.wav files/
adb shell am start -a android.intent.action.VIEW -d "tiro-scribe://dev-console" com.tiroscribe.app

# Re-validation plugin ORT (après bump)
mkdir -p .tmp-ort-check && cd .tmp-ort-check
npm pack onnxruntime-react-native@<version> --pack-destination .
tar -xzf onnxruntime-react-native-<version>.tgz
# diff des 3 fichiers contre node_modules/onnxruntime-react-native/
```

**Critères de choix des extraits TV** : 2+ locuteurs avec alternance claire (dialogue, pas narration), pas de musique forte, quelques minutes par encounter, jamais committés/distribués (droits — usage dev local uniquement).

---

## 3. Phases de développement

> Ordre clé : **l'ASR (P3) démarre après le spike runtime (P2)** ; les fixtures dev (P1) sont le tremplin qui rend l'ASR testable sans micro.

### P0 — Figer & arbitrer *(prérequis de tout)*

- [ ] **Commit du lot courant** *(→ utilisateur)* : suppression `SEED`/`STATE`/`TECH`, fix snackbar `AudioFileEncryptor` + tests DevConsole (`TherapistOnboarding`, `AudioFileEncryptor.encrypt`), commentaire `babel.config.js`, ce `TODO.md`. *(La session `encryptBytes` native est déjà committée.)*
- [x] **Corrections tsc urgentes `src/`** ✅ 27/10/2026 (4 fixes TDD, 12 tests verts, tsc 134 → 128) :
  - `InferenceModel/Download/ChecksumVerifier.ts:31-33` — `Uint8Array` promesse non awaitée : **le checksum ne s'exécutait pas** (boucle morte, tout fichier valide rejeté "Hash mismatch, 0 bytes") → `await` sur les deux `readBytes` ; 6 tests (`tests/InferenceModel/Download/ChecksumVerifier.test.ts`) ;
  - `State/Onboarding/VoiceState.ts:146` — `if (existing)` sur une `Promise` (toujours truthy) : **le calibrage passait sans modèle téléchargé** → `await getLocalPath('speaker_id')` ; 2 tests ajoutés à `tests/State/VoiceState.test.ts` ;
  - `Exception/RecordingTooShortError.ts` — code manquant (`undefined`) et `name` hérité `'Error'` → `RECORDING_TOO_SHORT` + `this.name` ; 4 tests (`tests/Exception/RecordingTooShortError.test.ts`) ;
  - `Screen/Onboarding/StepAccount.tsx:137` — typing `onPress` vs Paper 5.15 → `void handleSubmit(onSubmit)()` (bug purement typographique, validé par tsc ; test d'écran reporté au chantier RNTL, cf. P6).
- [x] **[ARBITRAGE] Biocode** ✅ 28/10/2026 : **projection vectorielle actée** — le hash à sens unique rendrait le matching multi-séances (P4) impossible ; `Biocode = ProjectionMatrix × SpeakerVector`, matching cosinus, AGENTS.md aligné
- [x] **Sécurité — `CryptoEngine` (vault)** ✅ 28/10/2026 (TDD, 5 tests rouges → 502 verts) : AES-256-GCM (format `IV 12B ‖ tag 16B ‖ chiffré`, auth GCM testée sur chiffre et tag corrompus), PBKDF2 ≥ 600 000 pour `keyFromPassword` (OWASP) ; `generateDeterministicBytes` reste un PRF rapide (1 000 itérations, séparé en constante dédiée). ⚠️ Rend les blobs CBC persistés indéchiffrables — ok en dev (DB reset au boot, règle R6) ; `RecoveryCode` garde ses 100 000 itérations (code ~2^60, hors périmètre P0)
- [x] **[ARBITRAGE] `Container.initialize()` / `AppConfig.getInstance()`** ✅ 28/10/2026 : `AppConfig.getInstance()` avait déjà disparu (MikroORM) ; **`Container.initialize()` supprimé** — `AppConfig` et `AppLogger` s'auto-enregistrent en bas de leur fichier (même pattern que les ~44 autres classes), `Container` ne connaît plus aucune classe concrète ; 4 sites d'appel et tests mis à jour (502 verts)
- [x] **[ARBITRAGE] Pull vs Push** ✅ 28/10/2026 : **push acté** (`stream(path)` + `onChunkLoaded`). Justification : 4 h ≈ 460 Mo de PCM → jamais tout en RAM ; le déchiffré n'existe qu'en RAM (jamais au disque en clair) ; les modèles exigent des fenêtres fixes que l'orchestrateur assemble au fil des chunks. `readChunkAt` retiré de la doc d'archi (§6 + §11), le WIP « Pull-style orchestrator » devient « Push orchestrator ». Le checkpoint P4 avance `processingOffset` à chaque chunk
- [ ] **Sourcer + convertir les extraits TV** (§2 recettes) — en parallèle, indépendant du code.

### P1 — Validation plateforme + fixtures

- [x] **Build natif iOS complet** ✅ 28/10/2026 (iPhone 17 Pro / iOS 26.5 simulateur) : build `pnpm ios:dev` OK (SceneDelegate SDK 58), **inférence CAM++ réelle validée de bout en bout** : decrypt GCM → fenêtrage → ONNX → biocode 512-dim persisté (`Create Dev Therapist`, ~45 s d'inférence). Android fait précédemment.
- [x] **Charger ~6 encounters** ✅ 28/10/2026 : 6 encounters / 6 patients / 6 queue_items `to_process` + 1 thérapeute (biocode 512-dim) en DB simulateur. Fixtures : extraits Gloria Rogers (5 wavs, anglais — ok pour fixtures, cf. `fixtures-local/`). ⚠️ Le reset DB au boot (R6) a vidé la base 2× en cours de route — re-seed complet refait (thérapeute + fixtures). Contournement UI : les boutons sous y≈0,62 sont inatteignables après focus d'un champ (pitfall simulateur, pas un bug produit) — charges faites avec liste réduite. `_04` chargé 2× (même duo, pour le matching multi-séances P4)
- [x] **`SpeakerId` (CAM++)** ✅ 28/10/2026 (TDD, 516 verts / tsc stable) : `config.yaml` du bundle parsé — nouvelle classe `SpeakerIdConfig` (schéma Zod sur le YAML 3D-Speaker, `js-yaml` ajouté aux deps ; invariant `feat_dim == num_mel_bins`), `Downloader.getArtifactText(capability, fileName)` lit l'artifact, `SpeakerId.getConfig()` expose `embeddingDim` / `numMelBins` / `sampleRateHz` / `frameLengthMs` / `frameShiftMs` (plus aucun fallback hardcodé). 🔎 **Découverte : le vrai `embed_dim` = 512, pas 192** — le hardcodé était faux ; `num_mel_bins` 80 confirmé. NB : `embeddingDim` n'est consommé nulle part à ce jour (aucun breakage), mais le pipeline futur doit attendre du 512-dim

### P2 — Spike runtime & modèles *(go/no-go, branche dédiée — AVANT l'ASR)*

> Recherche du 26/10/2026 : `react-native-executorch` 0.10.7 (21/10/2026) actif vs `onnxruntime-react-native` 1.24.3 (05/03/2026, ~8 mois). Aucun benchmark indépendant sur audio de séance thérapeutique. Le choix de runtime **découle** du choix des modèles. 🔎 *Aucune trace d'ExecuTorch dans le projet à ce jour (spike non démarré).*

- [ ] **Porte 1 — Faisabilité plateforme** (½ j) : `react-native-executorch@0.10.7` + `react-native-blob-util`, `allowBuilds` (pnpm 11), `deploymentTarget` iOS 16.4 → 17.0, `setTelemetryEnabled(false)` (politique « rien ne sort »). Build Android **et** iOS sur RN 0.88 / SDK 58. *Échec = stop.*
- [ ] **Porte 2 — Modèle critique** (1-2 j) : export `.pte` de **CAM++** (à défaut ECAPA-TDNN), front-end fbank figé (entrée taille fixe). Comparer embeddings ORT vs ExecuTorch (similarité cosinus ≈ 1) + latence/RAM sur 2 devices. Pré-release : pas de rétro-compat biocode.
- [ ] **Porte 3 — ASR** (1 j) : **Parakeet-TDT-0.6B-v3** (candidat n°1 : FR natif, timestamps mot/segment natifs, ~5,0-5,2 % WER FR vs ~6,3-7,2 % whisper-large-v3) sous ExecuTorch **et/ou** ORT sur un fichier réel déchiffré en RAM ; comparer à Whisper small. Mesurer WER/RTF sur un échantillon FR représentatif. NB : Parakeet iOS non annoncé → à vérifier par build ; dans `react-native-executorch` seul Whisper ≤ small + VAD FSMN sont exposés (orchestration TDT/timestamps à écrire).
- [ ] **Verdict** : tableau perf/qualité + décision (migration totale / hybride / rester ORT avec `pnpm patch`). Mettre à jour `docs/app_design_architecture.md` (§6 modèles, §9 roadmap).
- [ ] **Geler** : tant que la porte 2 n'est pas passée — ne pas démarrer l'ASR sur ORT à l'aveugle, ne pas supprimer le plugin ONNX. `src/InferenceModel/Runtime.ts` = seule interface vers le moteur.

### P3 — ASR *(blocage central de la chaîne de valeur)*

- [ ] **`AutomaticSpeechRecognizer.run()`** 🔎 *stub confirmé (ligne 139) + TODOs internes* : tokenizer jamais parsé (`AsrTokenizer = Record<string, never>`), sessions encoder/decoder jamais chargées (`asr_encoder`/`asr_decoder` déclarés mais non câblés), config Whisper Medium hardcodée. À implémenter selon verdict P2 (boucle Whisper ou TDT/Parakeet) **avec timestamps mot**. NB 28/10 : le contrat `InferenceModelFile` porte désormais un champ **`role`** (`model` / `config` / `tokenizer` / `preprocessor_config` / `generation_config` ; fallback `files[0]` pour `model` sur payloads legacy, résolution par `ModelArtifactStorage.getFileByRole`) — les 2ᵉ fichiers `.onnx` ASR (encoder) sont **sans rôle** : à arbitrer avec le P3 (rôles `encoder`/`decoder` ou autre). Génération API réparée (28/10) : toolchain isolée `scripts/api-generator/` (`@hey-api/openapi-ts@0.99.0` + `typescript@6.0.3` — le TS 7 natif n'expose plus l'API compilateur JS) ; `pnpm generate:api` régénère `src/Api/generated/` depuis `src/Api/spec.yaml` — ne jamais éditer le généré à la main.
- [ ] **Décision fbank (C2)** : extraction log-mel JS (`AudioFeatureExtractor`, mathjs « approximate ») inacceptable pour l'ASR (4 h d'audio). Choisir : **(a)** fbank natif vDSP/Swift + Kotlin dans `secure-recorder` *(reco)* · **(b)** graphe ONNX de prétraitement · **(c)** `fft.js` sur `Float32Array`. ASR + CAM++ (fbank 80) + pitch (trames 16 kHz) partagent un front-end commun → le mettre une fois en natif (bénéfice sécurité : JS n'a plus jamais d'audio en clair).
- [ ] **DSP client** : `pcm16ToFloat32` (lossless), normalisation EBU R128 (transcript only). Jitter/shimmer/HNR = server-side (acté).
- [ ] **VAD + Pitch comme capacités `Runtime`** 🔎 *écart confirmé* : `Setup.CAPABILITIES` déclare `vad`/`pitch`, `Runtime.createModel` ne connaît que `speaker_id`/`asr` (erreur `Unknown model capability`). Même pattern que `SpeakerId`. VAD = Silero v5 ; pitch selon verdict P2 (CREPE vs SwiftF0). ⚠️ `Runtime` est **single-session** (unload de la session précédente) — l'enchaînement VAD→ASR→CAM++ par segment devra composer avec cette contrainte.
- [ ] **Downloader : corriger puis auditer** *(la tâche « créer ModelManager » du KEEP est obsolète — l'infra existe 🔎)* : fix `ChecksumVerifier` (P0), audit C10 (API async `expo-file-system` SDK 58, reprise Range, checksum strict au bit près, Wi-Fi gate via `WifiVerifier`, file persistée `DownloadQueue`). Évaluer l'embarquement de Silero VAD + CAM++ (petits) en assets → ne télécharger que l'ASR. Sélection par langue déjà implémentée (`Setup` + `Downloader.isModelDownloaded(capability, language)`).
- [ ] **Orchestrateur** (mode selon arbitrage P0) : rolling buffer ; si > 2 s **et** silence VAD → cut & process ; force cut **28 s max**. Double buffering natif déjà en place (16 KB écriture / 512 KB lecture, events).
- [ ] **Traceabilité** : chaque résultat signé `modelName`/`modelVersion` ; ajouter `hardware_verified: true` + `model_hash` dans les métadonnées de sortie.
- [ ] **Étendre `HardwareGuard` aux seuils « recherche »** *(le gatekeeper générique existe déjà 🔎 : OS semver, RAM, arch 64-bit, deviceType, écran `incompatible`)* : RAM `>= 3.8 GB` iOS / `> 5.5 GB` Android ; iOS : rejeter tout `modelId` < `iPhone13,x` (iPhone 12 = `iPhone13,1`). Cible : iPhone 12+ (A14+, 4 GB), Android 6 GB / ≥ Snapdragon 888. Remplacer `semver` par `parseInt(Platform.Version)` (C6) si l'usage se limite à l'OS.

### P4 — Pipeline post-enregistrement *(le chaînon manquant)*

- [x] **Bug `QueueItem.isProcessable` (confirmé par la revue de tests)** ✅ 27/10 : `src/Entity/QueueItem.ts` lit désormais `this.retryCount < this.maxRetries` (constante de module supprimée) ; 2 tests marqueurs ajoutés (maxRetries 5 → retry, maxRetries 1 → stop).

🔎 *Précision vs anciennes notes : `QueueItemRepository` existe (basique, sans méthodes) et `QueueItem` est déjà riche (`PipelineStage`, `QueueItemStatus`, `processingOffset`, `createForEncounter`) — mais **rien ne les consomme après `stop()`** (seuls les fixtures DevConsole les créent).*

- [ ] **Déclenchement après `stop()`** : consommer les `QueueItem` — charger → VAD → découpage → ASR → persistance.
- [ ] **Checkpoint** : reprise via `QueueItem.processingOffset` + checkpoint **par segment** en SQLite (une séance d'1 h peut être longue → reprise après interruption).
- [ ] **Sorties par encounter** : `Transcription` (`Utterance[]`, `speakerLabel` corrects — ID aléatoire par session type `spk_x9d2`), `ProsodyMetrics` (`VoiceFrame[]` + pitch), `Patient` (biocode ≠ biocode thérapeute → nouveau patient).
- [ ] **Matching multi-séances** : 2ᵉ encounter du même duo → match de biocode → même patient.
- [ ] **Synchro acoustique** : aligner les mots du transcript sur les `VoiceFrame` (même base temps, fenêtres FFT synchronisées avec les timestamps ASR).
- [ ] **[ARBITRAGE] Sortie « deep data »** : `HighResTranscription` (words[], f0_stats, speech_rate, emotional_intensity…) vs contrainte archi « métriques dérivées server-side ». Décider du périmètre exact calculé client vs serveur.
- [ ] **Validation bout-en-bout sur fixtures TV** (critères de sortie) : `Transcription` avec `Utterance[]`/`speakerLabel` corrects · `ProsodyMetrics` avec `VoiceFrame[]` · `Patient` biocode ≠ thérapeute → nouveau patient · 2ᵉ encounter du même duo → même patient.

### P5 — Modes produit & UX

- [ ] **Switch Incognito** (écran `recording.tsx`, bistable) : défaut « Mode Recherche » (🧬) / « Mode Incognito » (🔒). Feedback visuel : thème gris sombre. 🔎 `Encounter.isIncognito` existe (colonne indexée + `static create(therapistId, isIncognito)`) ; le switch UI et le flow restent à faire.
- [ ] **Flow Incognito (Zero-Knowledge)** : transcrire → chiffrer AES-256 (clé dérivée du mot de passe maître) → **détruire l'audio** → le serveur ne reçoit qu'un blob illisible. Contrainte fatale à assumer dans l'UX : mot de passe maître perdu = contenu perdu à jamais.
- [ ] **Anonymisation (NER)** : évaluer sur de vrais transcripts **OpenMed-PII-French** (variantes ONNX/Android, texte clinique) vs **GLiNER-PII** (zéro-shot) vs `privacyFilter` d'ExecuTorch (qualité FR inconnue). Standard = NER intelligent (contexte gardé) ; Incognito = agressif NER+POS (tout PROPN masqué). Nommer `Redaction` (pas `AnonymizedEntity`). 🔎 `Service/Anonymizer` référencé par `ServicesContext` mais inexistant.
- [ ] **Écrans résultats** 🔎 *(screens existants : `HomeScreen`, `SubjectsScreen`, `TranscriptDetailScreen`, `SettingsScreen`, routes `app/main/(tabs)` + `transcript/`)* : brancher les données réelles (liste d'encounters sur Home, `SubjectsScreen`, download/share sur `TranscriptDetailScreen`).
- [ ] **Recherche FTS** : indexation du texte selon le mode (anonymisé / « à trous »). FTS5 déjà présent dans l'ORM.
- [ ] **UX d'initialisation** *(partiellement là 🔎 : `Setup.isSetup()` + `getTotalDownloadSizeMB()` alimentent l'onboarding)* : vérifier le parcours complet scan hardware → téléchargement (taille affichée) → prêt, et le branchement de l'écran `incompatible`.
- [ ] **Vision pipeline texte (post-ASR, à arbitrer)** : Whisper → NER → **Phonex** (lexique jargon médical) → **Remote RAG** (mots inconnus) → **Gemma 2B/9B** (grammaire, fluidité). ⚠️ Contradiction : Remote RAG incompatible avec la promesse Incognito 100 % local → réserver au mode Standard ou lexique local.

### P6 — Plateforme, performances & hygiène

**Vague 0 — nettoyage (risque quasi nul)** :
- [ ] Dépendances sans import (grep) 🔎 *liste revue au 27/10, toujours candidates* : `slugify`, `async-storage` (3.x dispo), `slider`, `datetimepicker` (+ plugin app.json), `reflect-metadata`, `react-dom`, devDeps `@faker-js/faker`, `ts-node`, `js-yaml`, `esbuild`, `babel-plugin-inline-import`, `@babel/preset-env`, `@testing-library/jest-native` (déprécié), `@types/react-test-renderer`. **Vérifier chaque entrée (`pnpm why` + tests) avant retrait.** `babel-jest ^29` incohérent avec Jest 30 (30.5.2 dispo).
- [ ] Fichiers à ne pas suivre 🔎 *toujours suivis* : `repomix-output.xml` (33 k lignes au dernier diff !), **`tiro-scribe.sqlite` suivie dans git (⚠️ risque données sensibles — vérifier et purger l'historique si besoin)**, `.DS_Store`, `scripts-tmp-babel-test.js`, `expo-main/` (vide).
- [ ] Mocks : garder **un** mécanisme (`json-server` vs `msw` — msw 3.x dispo).
- [ ] Doc API : `docs/api-generation.md` décrit encore OpenAPI-Generator alors que `generate-api.js` utilise `@hey-api/openapi-ts` → retirer `@openapitools/openapi-generator-cli` (2.32 → 2.42 dispo mais à supprimer), aligner script/doc.
- [ ] Code mort `src/` 🔎 *nuancé à l'audit* : `Util/AsyncQueue.ts` (0 utilisateur), `Util/Timer.ts` (à confirmer), **`Util/EventLoop.ts` est utilisé par `VoiceState`** (`await EventLoop.yield()`) — ne pas supprimer sans recâblage ; `Components/AsyncButtonUtils.tsx`. *(retraité de la liste : `Core/AppRouter.ts`, utilisé par `HomeState`/`RecoveryState`/écrans)* ⚠️ Certains prévus pour l'ASR/pipeline — **valider un par un**.
- [ ] Exceptions : 23 fichiers, 16 classes référencées ≤ 1 fois hors `Exception/` → supprimer ou regrouper (~8 fichiers). Suffixes incohérents (`*Error` vs `*Exception`).

**Vague 1 — industrialisation plateforme** :
- [ ] **L2 — ONNX en `pnpm patch`** : remplacer les 3 mutations de `plugins/withOnnxruntime` par `pnpm patch onnxruntime-react-native@1.24.3` → **disparition de la règle R3**. Supprimer le hack `binding.js` (no-op), **épingler les 3 AAR `latest.integration`**, réduire le plugin (~210 l → ~60). Question pré-ASR : extensions ORT + AAR QNN réellement nécessaires (poids APK) ?
- [ ] **L3 — CNG** *(non vérifié, ne pas appliquer en l'état)* : diff prebuild temporaire vs `ios/`+`android/` committés avant toute décision.
- [ ] **L4 — Builds ÷2** : lever `buildReactNativeFromSource: true` + `useFrameworks: 'static'` en testant les prebuilts SDK 58. Risque : pods ORT × frameworks dynamiques → test iOS requis. Dépend de L2.
- [ ] **Bumps** 🔎 *table actualisée au 27/10/2026* :
  | Paquet | Installé | Latest | Note |
  |---|---|---|---|
  | `lucide-react-native` | 0.575.0 | **1.61.0** | **major** — vérifier breaking icons |
  | `uuid` | 13.0.0 | **14.0.3** | major ; re-tester `react-native-get-random-values` (2.0 dispo, C3 vise sa suppression) |
  | `@testing-library/react-native` | 13.3.3 | **14.1.0** | major — caler Jest 30 |
  | `kysely` | 0.28.14 (+patch 0.28.17) | 0.29.7 | mineur ; **régénérer le patch pnpm** |
  | `zod` | 4.4.3 | 4.6.7 | mineur |
  | `@tanstack/react-query` | 5.100.9 | 5.105.0 | mineur |
  | `react-hook-form` | 7.75.0 | 7.91.0 | mineur ; `@hookform/resolvers` 6.0 major lié |
  | `dayjs` | 1.11.20 | 1.11.23 | a priori supprimé avec C4 |
  | `mathjs` | 15.1.1 | 15.2.0 | a priori supprimé avec C1 |
  | `@biomejs/biome` | 2.4.15 | 2.6.3 | mineur |
  | `storybook` / `@storybook/react-native` | 10.2.x / 10.4.0 | 10.6/10.7 | mineur |
  | `react` / `react-dom` / `react-test-renderer` | 19.3.0 | 19.3.1 | patch |
  | `eslint` (dev) | 10.3.0 | 10.13.0 | mineur |
  | Babel 7.x (dev) | 7.29.x | **8.0.x** | **major** — ne pas bump à la légère (R1) |
  | `msw` (dev) | 2.14.5 | **3.0.3** | major (lié au chantier mocks) |

**Remplacements maison → lib/platform (C1-C9)** :
- [ ] C1 `mathjs` → `dot/cosine/matVec` sur `Float32Array` (~30 l) ; dédupliquer `Biocode.similarityTo` vs `VectorProjection.cosineSimilarity`.
- [ ] C3 `uuid` + `react-native-get-random-values` + `expo-crypto` → tout sur quick-crypto 🔎 *(quick-crypto 1.1.9 déjà installé — le C3 devient trivial)*.
- [ ] C4 `dayjs` → epoch ms (`number`) + `Intl` à l'affichage. 🔎 *constaté à l'audit : `Encounter.createdAt/updatedAt/syncedAt` utilisent toujours Dayjs ISO strings — la règle « millisecondes entières » n'est respectée que pour `totalDuration`.*
- [ ] C5 `lodash` (7 fichiers, fonctions triviales) → natif.
- [ ] C7 formulaires : **un seul** paradigme — reco Legend-State + zod (`State/Onboarding/Schema.ts`).
- [ ] C9 `typesafe-i18n` (stagnant) → dictionnaire `fr` typé par `typeof en` (`satisfies`) + classe `Localization` (448 l de types générés en moins).

**Module `secure-recorder` (sans toucher au format AES-GCM chunked ni à l'isomorphisme)** :
- [ ] Réduire la couche TS (`SecureRecorder.ts` 422 l, `ErrorNormalizer.ts` + 466 l de tests, `PermissionManager`, `DecryptionManager`).
- [ ] Supprimer `build/` suivi + `verification.txt`/`scripts/verify-ios.sh` si obsolètes.
- [ ] Y loger le prétraitement audio (C2) + déchiffrement-vers-RAM : une seule traversée JS↔natif, JS n'a plus jamais d'audio en clair (**bénéfice sécurité**).

**Release & distribution** :
- [ ] R8 en release non testé : vérifier quick-crypto / nitro / ORT sur build release.
- [ ] **16 KB page size avant Google Play** (R8).
- [ ] DevConsole + Storybook hors bundle release (`if (__DEV__)` / routes conditionnelles).
- [ ] EAS : à trancher avant distribution.

### P7 — Santé du code *(après les gros chantiers)*

#### Revue complète des tests (27/10/2026) — rapport : `docs/test-review-2026-10-27.md`

> 59 suites relues contre les 34 règles testing-best-practices : ~55 constats (7 CRITICAL, 13 HIGH). Faits marquants : le « vrai SQLite » du Repository est un fake regex avec 7 `it.skip` noyau ; doublon mocké de `ChecksumVerifier` ; `CryptoEngine` cœur (encrypt/decrypt) jamais testé ; propriété de sécurité du biocode skippée sur justification fausse ; `Encounter` testé sur un mock divergent ; `OnboardingState` 5/5 skippés ; tests « composant » qui ne rendent rien.

**Vague A — Restaurer la confiance (CRITICAL)** ✅ *exécutée le 27/10/2026 — suite complète 640 → 683 verts, 0 échec, skips 21 → 6 (restants : Math/orthonormalité, documentés)* :
- [x] `tests/helpers/kysely.ts` → **sql.js** (WASM, JSON1 inclus) + dialect Kysely maison (`tests/helpers/SqlJsDriver.ts`, `SqlJsDialect.ts`) — 7 tests Repository dé-skipés, **verts du premier coup, aucun bug réel** (le fake était le seul coupable). ⚠️ Dép ajoutée (`sql.js`, `@types/sql.js`) → **re-prebuild natif requis avant tout build** (règle R3).
- [x] Supprimer `tests/InferenceModel/Model/ChecksumVerifier.test.ts` (doublon mocké) — « close sur erreur mid-read » porté en version async dans `Download/`.
- [x] Couvrir `CryptoEngine` : round-trip, IV 16 bytes + IV aléatoire, mauvaise clé, hash sha256, `generateDeterministicBytes`. 🔎 **Correctif d'infra au passage** : le mock `jest.setup.ts` d'`expo-crypto` retournait `Buffer.alloc(32)` fixe — tout IV de 16 bytes était invalide en test → mock branché sur Node crypto (getRandomBytes/digestStringAsync/getRandomValues/randomUUID).
- [x] Réactiver les 3 `it.skip` Math — **verts** : la justification du skip (« mock PBKDF2 ») était obsolète ; la propriété « clés différentes → projections différentes » est prouvée.
- [x] Dé-skiper `OnboardingState` — les 5 skips venaient d'un `beforeEach` cassé : **import fantôme `InferenceModelDownloader`** (export réel = `Downloader` → le vrai Downloader était injecté) + mock `AppLogger` non constructible. 6 tests verts.
- [x] Réécrire `Encounter.test.ts` / `QueueItem.test.ts` sur les **vraies classes** (10 + 10 tests) ; `mockEntity.ts` conservé (entité générique de 4 suites Database). 🔎 **Bug confirmé en src** : `QueueItem.isProcessable` ignore `maxRetries` — **corrigé depuis, voir P4**.
- [x] `DownloadTaskExecutor` : transition réelle `[Pending, Downloading, Completed]` (queue réelle en Pending, souscription avant start) + `cancel()` en cours de download (`true`, `Cancelled`, message exact) + 4 branches `Runtime` (fallback download, not available, unknown capability, runRaw après release). Suite vérifiée avec `--randomize`.

**Vague B — Honnêteté des tests (HIGH)** ✅ *exécutée le 27/10/2026 — suite complète 683 → 701 verts, 0 échec ; fichiers touchés réparés pour tsc (129 → 71 erreurs, zéro restante dans les fichiers modifiés)* :
- [x] Renommer/assert les tests fantômes (nom promet, corps ne tient pas) : **tests/Database** (Repository ordre réel, QueryCompiler SQL réel, DefinitionLanguageWriter quote réelle + afterEach, Database instance null + getConnection sans init ; le test « FK column » renommé — le nom mentait, le `json_extract` est légitime sans `@ForeignKey`) ; **tests/Math + Speaker** (asserts réels : normalisation, confidence, salt) ; **State/Service/Decorator/Config** (VoiceState observables réels, AppConfig contrat, GlobalActivityBar identité de référence).
- [x] Inverser les contrats dangereux : gardes **ajoutées côté src en TDD** — `InvalidMasterKeyException` (nouvelle) + `InvalidDimensionError` (plafond `MAX_DIMENSION = 4096`) dans `ProjectionMatrixFactory`, `InvalidAudioParametersException` (nouvelle) dans `AudioFeatureExtractor`, `[[]]` → `InvalidDimensionError` dans `VectorProjection`. Les tests assertent désormais le throw (type + message), plus `not.toThrow()`.
- [x] `SchemaValidator.test.ts:72` : `try/catch` remplacé par 3 tests distincts (champ manquant / type erroné / garde disparue = échec).
- [x] Restaurations d'état déplacées en hooks : `AppConfig.isDev`, `Database.instance`, `EntityMetadata.getColumnDefaults`, `Device.isDevice` (→ dépendance d'ordre supprimée), fake timers (`Timer.test.ts`).

**Vague C — Hygiène** ✅ *exécutée le 27/10/2026 — 711 verts / 718, 0 échec (7 skips documentés) ; tsc 71 → 45 ; −17 tests dupliqués sans perte de scénario, +30 tests de branches* :
- [x] Doublons supprimés : `FieldDecorator.test.ts` (sous-ensemble strict de `PropertyDecorator` — 7 tests, aucun portage nécessaire), blocs Z ≡ E (Registry +1 assertion portée sur le message, AbstractEntity, DefinitionBuilder ×2 paires), `MetadataReader` (scénario cross-file conservé dans `MetadataWriter` avec plus), `HardwareGuard.test.ts:273` (+ fix constructeur réel dans le test : matrix + logger). `ClassDecorator` : déjà fait par la Vague B. Tests de lib tierce (`GlobalActivityStatus.test.ts:19-33`, fichier réel = `tests/State/`) supprimés, les 3 tests du composant gardés.
- [x] Stub `@legendapp/state` extrait vers **`tests/stubs/LegendAppStateStub.ts`** + `jest.mock` explicite dans les 2 suites qui stubbaient (`VoiceState`, `OnboardingState`). ⚠️ **Piège réglé au passage** : un premier essai dans `tests/__mocks__/@legendapp/state.ts` s'appliquait **automatiquement à toutes les suites** (manual mock node_modules scanné par le haste map) et cassait `DownloadTaskExecutor` qui utilise la vraie lib → dossier non-magique `tests/stubs/` obligatoire. `GlobalActivityStatus` et `StartupOrchestrator` tournent sur la vraie lib (verts). TODO dans le stub : repasser sur la vraie lib partout.
- [x] Factories : `tests/helpers/FakeVoiceRecorder.ts` (7 occurrences remplacées), `createTherapist()` + `pendingProvider` recréés en `beforeEach` (`VoiceState`) — plus d'état partagé.
- [x] Mocks morts supprimés : AppLogger (MetadataReader/MetadataWriter), Container (VoiceCalibrator — deps injectées via `createCalibrator`), import `SecureRecorder` inutilisé, polyfill `Symbol.metadata` redondant (fourni par `jest.setup.symbols.ts`).
- [x] Branches non couvertes ajoutées : **`Builder` 100 % branches** (+6 : accessor hook, court-circuit, gardes `isDev` ×3, initializer null), **`SchemaValidator` 100 % branches** (+12 : enum/notBlank/integer/min + early-return), `AppConfig` chemin prod (+7 + 1 skip), `RecoveryCode` (+2 différenciation sel/code).
- [x] Bench déplacé : `tests/Math/Math.bench.test.ts` (`jest.setTimeout(30_000)`, borne large 15 s, caractère indicatif documenté) — `Math.integration` sans plus aucune assertion temporelle. 🔎 **Découverte** : `babel-preset-expo` inline chaque `process.env.EXPO_PUBLIC_*` au transform → la branche prod « env bakée » d'`AppConfig` est **intestable sous Jest** (mutation runtime sans effet) — 1 `it.skip` documenté, pas un bug (la branche existe en build réel).

#### Dette existante

- [x] **71 erreurs `pnpm run type-check`** 🔎 *résolues au 28/10 (migration MikroORM + purge) : il n'en reste que 3, toutes préexistantes et hors ORM* :
  - `Context/ServicesContext.tsx:6-7` — importe `Service/Anonymizer` et `Service/AudioProcessing` **inexistants** (cassée à brancher en P5 ou imports à retirer) ;
  - `tests/Components/AsyncButton.test.tsx:47` — comparaison impossible entre variants d'enum.
  - *(résolues entre-temps : `Database/index.ts` registry, `Database/Type.ts` AbstractEntity, `App.tsx` supprimé)*
- [x] **39 erreurs tsc `tests/`** — résolues par la migration (Downloader, mockEntity, ConfigProvider, Criteria, Encounter corrigés/supprimés ; seul `AsyncButton` ×1 reste, voir ci-dessus).
- [x] **Test-sentinelles decorators** — obsolète : plus aucun décorateur depuis MikroORM ; le patch R1 ne protège plus que le profil `hermes-stable`.
- [ ] Relancer `test:kotlin` / `test:swift` (tests natifs — non relancés depuis l'audit).
- [ ] **Réparer l'infra des tests de composants** 🔎 *(découvert au 27/10)* : tout `render()` RNTL crashe — le mock `Text` du preset RN 0.88 charge `react-native/react-private-interface` qui **n'existe pas** dans le paquet (`jest-expo` + mapper `^react-native/.*`). Symptôme : `Could not locate module react-native/react-private-interface`. Aucun test existant ne render de composants (AsyncButton teste de la logique pure) — le trou est invisible tant qu'on n'écrit pas de test d'écran. À régler avec le bump RNTL 14 (P6) ; premier candidat : `StepAccount` (voir son fix P0).
- [x] `RecordNormalizer` — supprimé par la migration MikroORM ; exports `Repository/index.ts` complets (3 repositories). *(reste : scripts `preios`/`clean:metro` redondants)*
- [ ] `Context/ServicesProvider` — 3 services `null` : à brancher au fil de P3-P5.
- [ ] Migrations DB versionnées : absentes (MikroORM `orm.schema.update()` = sync additive au lancement — pas de versioning/drop).
- [ ] **DevConsole : rattachement `.dat` perdu après reboot** 🔎 *(découvert au 28/10)* : `AudioScanner` cherche `<name>.dat` mais `AudioFileEncryptor` écrit `fixture_<uuid>.dat` → après un redémarrage, les `.dat` ne sont plus rattachés aux `.wav` (boutons « Encrypt » au lieu de « Load ») ; contournement actuel : ré-encrypter. Correctif : nommage déterministe `${name}.dat`.

---

## 4. Hors périmètre app (vision produit & serveur)

*Préservé de KEEP.md — ne pilote pas le dev app immédiat, mais cadre les décisions.*

- **Vision « Verify, Don't Trust »** : institution numérique, code client open source, preuves vérifiables. Jamais d'enrichissement spéculatif.
- **SCIC** : réserves impartageables (verrou anti-rachat), gouvernance 3 collèges (Salariés / Scientifiques avec veto moral / Utilisateurs bêta-testeurs), fondateur salarié (~4 k€ net).
- **Business** : ~49-69 €/mois, seuil de rentabilité ~200-300 abonnés, la marge finance le dataset de recherche.
- **Roadmap lancement** : Alpha Science (M1-3, comité + validation NER par les chercheurs) → Création SCIC (M3) → Commerciale (M6).
- **Serveur (ultérieur)** : dérivations jitter/shimmer/HNR/formants/VSA, indices Fluency/Stability/Melodic/Timbral, Δ_t vs baseline patient, stats globales, backup cloud (blob chiffré en Incognito). L'app fournit les entrées canoniques (`VoiceFrame`, transcript, timestamps) — elle n'interprète pas (neutralité clinique : indices de changement, jamais de diagnostics ; sentiment = hors scope produit).
- **Écartés (fin 2026)** : Voxtral-Mini (4 B params, hors mobile) · Whisper large · `react-native-sherpa-onnx` XDcobra · vague « persistance » du plan de maintenabilité (ORM conservé) · TTS `say` pour les fixtures.

---

## 5. Journal de l'audit du 27/10/2026 *(remplace la traçabilité de fusion)*

| Affirmation des anciennes notes | Verdict audit |
|---|---|
| ASR stub, VAD/Pitch absents du Runtime, aucun consommateur de QueueItem, CryptoEngine CBC/1000, Container double singleton, ServicesContext cassé, 134 erreurs tsc | ✅ **Confirmé** |
| « Casse `src/api` à corriger » | ✔️ **Déjà fait** (commit 8a98e53) — retiré du plan |
| « Bump quick-crypto » | ✔️ **Déjà fait** (1.1.9, commit 5eacffa) |
| « Working tree : encryptBytes + DevConsole à figer » | ⚠️ **Partiellement fait** — reste la P0 actualisée |
| « Créer `ModelManager`/downloader » (KEEP) | ❌ **Obsolète** — infra complète existante (`Download/` ×7 classes + `DownloadQueue` + `WifiVerifier`/`SystemVerifier` + sélection par langue) → correction + audit |
| « Créer DeviceCheckService + écran Incompatible » (KEEP) | ❌ **Obsolète** — `HardwareGuard` + `DeviceCompatibilityGate` + `app/incompatible.tsx` existent → étendre aux seuils recherche |
| « QueueItem : repo vide » | ⚠️ **Dépassé** — repo basique + `PipelineStage`/`QueueItemStatus` existent ; le manque = le **consommateur** |
| « 620 tests verts » | 📈 **628/649** au 27/10 |
| `Util/EventLoop` code mort | ⚠️ **Nuancé** — utilisé par `VoiceState` |
| Versions « latest » des bumps | 🔄 **Actualisées** (table P6) — drift modéré, majors : lucide 1.x, uuid 14, RNTL 14, Babel 8, msw 3 |
| Nouveau, non documenté avant audit | Patch `kysely@0.28.17` (R1b) · 4 bugs tsc `src/` (P0) · `dayjs` toujours dans les entités (C4 précisé) · `Runtime` single-session (contrainte P3) |
