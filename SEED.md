# Tiro Scribe — Seeding dev : ingestion de données réalistes

## Objectif

Je ne peux pas réaliser de vraies séances de thérapie moi-même. L'objectif est donc une **interface de dev** qui ingère toutes les données nécessaires pour travailler sur les moteurs d'analyse :

1. **Le footprint thérapeute** — un `Therapist` dev avec un biocode cryptographiquement valide (vecteur vocal projeté CAM++).
2. **Des séances simulées** — ~6 encounters avec de **vrais fichiers audio multi-locuteurs** (extraits de séries TV), chiffrés au format natif, prêts pour le pipeline local : `QueueItem (Waiting)` → VAD → ASR (Whisper) → Diarization (CAM++) → Biocode Match.

Résultat attendu : des `Encounter` en `status = ToProcess` que la Phase 3 (le pipeline) transforme en `Transcription` + `ProsodyMetrics` + `Patient` avec biocode.

---

## Décisions (tranchées le 26/10/2026)

| Question | Décision |
|---|---|
| Source audio | **Extraits de séries TV** (vrais acteurs, vraie prosodie). Les voix synthétiques (TTS `say`) sont écartées : prosodie irréaliste, risque élevé que CAM++/la diarization n'en tirent rien d'utilisable. |
| Transfert vers le device | **`adb push` vers `/sdcard/Download`** et scan direct — pas de `run-as`, on veut un outil d'ingestion simple. |
| Seeds incognito (mode Bunker) | **Non, pour l'instant.** Tous les encounters seedés sont `isIncognito = false`. |
| `totalDuration` | **Durée exacte**, calculée depuis les bytes PCM (voir `DevEncounterSeeder` plus bas) — le calcul est trivial, autant être exact. |

---

## État au 26/10/2026

| Brique | État | Fichier(s) |
|---|---|---|
| Forge thérapeute (identité + master key) | ✅ | `src/Security/TherapistForge.ts` |
| Footprint (biocode) depuis un **fichier audio** | ✅ (sans UI — accès à ajouter) | `src/Dev/DevTherapistOnboarding.ts` |
| Chiffrement d'un fichier brut → `.dat` natif (+ durée exacte) | ✅ | `src/Dev/DevFileEncryptor.ts` |
| Extraction/normalisation WAV → PCM 16 kHz mono | ✅ | `src/Dev/DevAudioSegmentExtractor.ts` + `WavHeader.ts` |
| Scan d'un répertoire de sources audio | ✅ (chemin avec préfixe `file://`) | `src/Dev/DevAudioScanner.ts` |
| Écran dev (scan + encrypt + seed) | ✅ routé sur `/dev-seed` | `src/Dev/DevAudioScreen.tsx` + `DevAudioState.ts` + `app/dev-seed.tsx` |
| **Pont vers le domaine** (Encounter/Patient/QueueItem) | ✅ implémenté + 14 tests | `src/Dev/DevEncounterSeeder.ts` |
| Extraits de séries TV à ingérer | ❌ à sourcer + convertir | hors dépôt (voir Source audio) |

Abandons du plan initial : ~~playback loop micro~~ et ~~`AudioPlaybackRecorder`~~ (remplacés par l'ingestion directe de fichiers), ~~voix TTS~~ (remplacées par les extraits TV), ~~`DevSeedException`~~ (`DevEncryptionException`), ~~`SyntheticDialogueGenerator`~~ (plus de dialogue synthétique à générer).

---

## Pourquoi les fichiers ne peuvent pas être fabriqués hors de l'app — et le contournement

| Contrainte | Implication |
|---|---|
| `SecureRecorder` chiffre en AES-256-GCM **chunked** (`[4B size][12B IV][ciphertext+tag]`) | Impossible de pré-générer un `.dat` valide hors du module natif |
| Clés dans Keychain / AndroidKeyStore | Hardware-bound, non extractables |
| Biocode = vecteur vocal projeté via CAM++ | Exige une vraie inférence ONNX sur du PCM |

**Contournement trouvé** : le module natif expose `SecureRecorder.encryptBytes` / `SecureRecorder.encryptFile`. On peut donc chiffrer **un fichier existant** : le `.dat` produit est *indiscernable d'un enregistrement réel* et déchiffrable par l'app. C'est ce que fait `DevFileEncryptor` (DEV ONLY) — et c'est ce qui rend possible une vraie *ingestion* plutôt qu'une re-capture micro.

---

## Pipeline d'ingestion actuel (implémenté)

```
Extraits audio (PCM/WAV/AIFF/RAW)
        │  adb push via run-as dans le sandbox (voir Transfert ci-dessous)
        ▼
app/dev-seed (DevAudioScreen) ── DevAudioScanner.scan(dir) ──► liste des entrées (+ statut chiffré)
        │  « Encrypt » / « Encrypt All »
        ▼
DevFileEncryptor.encrypt(path)
        │  WAV  ► DevAudioSegmentExtractor (float32→int16, 16 kHz mono) ► SecureRecorder.encryptBytes
        │  PCM  ► SecureRecorder.encryptFile (direct)
        │  + durée calculée (durée exacte, cf. Décisions) et exposée sur DevAudioIngest
        ▼
seed_xxxxxx.dat  (format natif AES-256-GCM chunked, dans documentDirectory)
        │  « Seed »
        ▼
DevEncounterSeeder.seed ► Encounter (ToProcess) + Patient (biocode '') + QueueItem (Waiting/Pending)
```

### Transfert vers l'émulateur — méthode validée le 26/10

`/sdcard/Download` est **inaccessible** à l'app sans permission média (scoped storage Android) — le scan revient vide. La méthode qui marche (build debug, sans rien rebuild) :

```bash
ffmpeg -i episode_scene.mkv -ar 16000 -ac 1 scene_01.wav
adb push scene_01.wav /data/local/tmp/
adb shell run-as com.tiroscribe.app cp /data/local/tmp/scene_01.wav files/
```

Puis saisir ce chemin dans l'écran dev (⚠️ **préfixe `file://` obligatoire** — `expo-file-system` exige une URI, un chemin nu revient vide) :

```
file:///data/user/0/com.tiroscribe.app/files/
```

### Piège natif résolu : chemins sans `file://`

Le module natif `SecureRecorder` exige des **chemins POSIX nus** : passer l'URI `file://` de `documentDirectory` produit `InitializationException: No such file or directory`. `DevFileEncryptor.toNativePath()` strippe le préfixe avant tout appel natif (encryptBytes/encryptFile) et sur le chemin de sortie. Le `.dat` produit est bien écrit (vérifié : 96 192 bytes pour un WAV de 96 078).

⚠️ À savoir : au boot dev, la DB peut être **reset** (log `[Database] resetting database`) — le Seed exige alors un thérapeute persisté, sinon erreur explicite `THERAPIST_NOT_FOUND` (comportement voulu, message affiché dans l'écran).

### Footprint thérapeute (Phase 1 — one-time)

`DevTherapistOnboarding.createFromAudio(rawAudioPath, segment, input)` :

```
1. Fichier brut → PCM (DevAudioSegmentExtractor)
2. Extraction du segment temporel (ex. 5 s → 35 s : la voix du thérapeute seul)
3. PCM → biocode projeté (VoiceCalibrator.generateBiocode)
4. Persist thérapeute + master key (MasterKeyVault)
```

Le biocode dérive d'un vrai audio via la vraie chaîne ONNX — identique à ce que produirait la calibration micro, mais **reproductible** (même fichier ⇒ même segment ⇒ même vecteur). Pratique : prendre un extrait TV avec un locuteur seul en voix off comme « voix du thérapeute ».

---

## Ce qui manque — le chemin restant

### 1. `DevEncounterSeeder` — ✅ implémenté le 26/10 (`src/Dev/DevEncounterSeeder.ts`)

Le pont est en place : `seed(therapistId, encryptedPath, durationMs)` persiste le triplet et retourne un `DevEncounterSeed` (encounter + patient + queueItem). La durée exacte est calculée par `DevFileEncryptor` (`durationFromSamples` / `durationFromMono16kPcmBytes`) et expose aussi le bouton « Seed » de l'écran (`DevAudioState.seedEncounter` résout le thérapeute via `TherapistRepository.findCurrent()`).

Branchement repositories custom complété au passage : `repositoryClass` ajouté sur `@Entity` de `Encounter` et `QueueItem`, `QueueItemRepository` ré-exporté du barrel `@/Repository` (oubli manifeste — le commentaire du barrel le demandait). 14 tests Jest couvrent le seeder et les calculs de durée (`tests/Dev/`).

Reste pour l'écran :

- **Phase 1 sans UI** : `DevTherapistOnboarding.createFromAudio` n'a aucun déclencheur — ajouter un accès « Dev Therapist Onboarding » à l'écran dev (segment = voix seule du thérapeute dans l'extrait source) ; c'est le prérequis du Seed sur une DB fraîche (`THERAPIST_NOT_FOUND` sinon).
- Améliorations cosmétiques : la snackbar d'encrypt affiche `0 bytes` en sortie (cache `getInfoAsync` sur le chemin nu — le fichier réel est correct).

### 2. Exposer l'écran dev — ✅ fait le 26/10

- Route `app/dev-seed.tsx` créée (le trigger 5-taps existait déjà dans `src/Screen/SettingsScreen.tsx` et poussait vers `/dev-seed` — TECH.md §7 est donc caduque sur ce point).
- Accès direct validé au deep-link : `adb shell am start -a android.intent.action.VIEW -d "tiro-scribe://dev-seed" com.tiroscribe.app` (pratique quand l'onboarding bloque les tabs).

### 3. Étendre l'écran : « Seed as Encounter » — ✅ fait le 26/10

Le bouton « Seed » est actif sur chaque fichier chiffré (désactivé sans durée). Pas de case incognito pour l'instant (décision ci-dessus). Reste l'accès Phase 1 (onboarding dev thérapeute) cf. §1.

### 4. Sourcer et convertir les extraits TV

Voir section suivante.

### 5. Phase 3 — laisser le pipeline travailler (le vrai test)

Une fois les encounters en `ToProcess`, le pipeline existant traite :

```
QueueItem (Waiting) → VAD → ASR (Whisper) → Diarization (CAM++) → Biocode Match
```

Résultats à valider :

- `Transcription` créée avec `Utterance[]` et `speakerLabel` corrects ;
- `ProsodyMetrics` créée avec `VoiceFrame[]` ;
- `Patient` recevant un biocode ≠ biocode thérapeute → nouveau patient ;
- 2e encounter du même duo de locuteurs → match de biocode → même patient (le matching multi-séances fonctionne).

---

## Source audio : extraits de séries TV

Critères de choix des extraits :

- **2+ locuteurs distincts** avec des prises de parole alternées claires (dialogue, pas narration) — c'est ce que la diarization doit séparer ;
- qualité audio correcte (pas de musique forte par-dessus les voix) ;
- quelques minutes suffisent par encounter ; un même épisode peut fournir plusieurs extraits.

Conversion vers le format d'ingestion :

```bash
ffmpeg -i episode_scene.mkv -ar 16000 -ac 1 -f s16le scene_01.pcm
# ou en WAV (normalisation automatique par DevAudioSegmentExtractor) :
ffmpeg -i episode_scene.mkv -ar 16000 -ac 1 scene_01.wav
```

⚠️ **Droits** : extraits protégés, usage **strictement local en dev** — jamais committés dans le dépôt, jamais distribués. Garder les sources hors du repo (ex. `/sdcard/Download` de l'émulateur et un dossier local non versionné).

---

## Ce qu'on a validé au premier test (26/10, émulateur Pixel_7)

1. ~~`DevAudioScanner` lit `/sdcard/Download`~~ → **inaccessible sans permission** ; méthode retenue : `run-as` + sandbox + préfixe `file://` (voir Transfert).
2. Le `.dat` produit est réel (96 192 bytes pour 96 078 en entrée, durée exacte 3 s calculée automatiquement).
3. ~~Le chemin heureux du seed est couvert par les tests Jest seulement~~ → **✅ validé de bout en bout sur device le 26/10** : thérapeute dev créé avec biocode CAM++ réel (biocode 128 dims, confidence 1, ~20-25 s d'inférence), puis tap Seed → snackbar `Seeded: encounter=… patient=… queueItem=…` et vérification SQLite (`run-as com.tiroscribe.app cat files/SQLite/tiro-scribe.sqlite`) : `encounters` (FK `therapist_id` valide, `status=to_process`, `totalDuration=3000` exact, chemin `.dat`), `patients` (FK valide), `queue_items` (`pending`/`waiting`, chemin `.dat`). Le seed est **répétable** : chaque tap ajoute un triplet Encounter/Patient/QueueItem (comportement attendu en dev ; le pipeline lancé ensuite devra les consommer puis les purger).
4. Reste à valider sur un vrai batch : la séparation CAM++ des locuteurs de l'extrait (vrais acteurs ⇒ attendue bien plus fiable qu'avec du TTS).
5. ⚠️ Piège découverte pendant ce test (résolu, voir TECH.md §0.13) : les getters/setters des entités (`getUuid()`, `getEmail()`…) renvoyaient `undefined` sur device — les class fields natifs Hermes écrasaient les accessors `@Column`. Symptôme : le seed échouait avec `Cannot read property 'length' of undefined`. Fix = `babel.config.js` (decorators rendus au preset expo) + redémarrage Metro `--reset-cache` (Metro ne relit pas `babel.config.js` à chaud). `DevEncounterSeeder.validate` renvoie désormais des erreurs explicites (`INVALID_THERAPIST_ID`…) qui rendent ce genre de régression diagnostiquable d'emblée.
