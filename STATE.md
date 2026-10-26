# STATE — État des lieux du projet

> Généré le 2026-10-26 · branche `dev` · dernier commit **24 mai 2026** (~5 mois d'inactivité)
> Référence architecture : `docs/app_design_architecture.md`

---

## TL;DR

L'application est un **enregistreur clinique chiffré fonctionnel** : onboarding complet (compte + calibrage voix + recovery kit), téléchargement de modèles, enregistrement audio réel chiffré AES-256-GCM sur disque, module natif iOS/Android mature. Le pipeline **s'arrête après l'enregistrement** : la transcription locale (ASR Whisper) est un stub, VAD et Pitch n'existent pas encore.

**Chantier en cours au moment de la pause (mai 2026)** : l'interface d'admin Dev (`src/Dev/`) pour **charger des fixtures audio open source** (LibriSpeech, Common Voice…) — pas des séances enregistrées au micro — afin de pouvoir développer et tester le futur pipeline d'analyse audio sur des données réalistes. Briques de traitement terminées, câblage UI/données manquant (voir « Chantier en cours »).

---

## Stack

- **React Native 0.83 + Expo 55** (expo-router, dev-client), Hermes, iOS/Android uniquement
- **État** : `@legendapp/state` (ViewModels observables) · **UI** : React Native Paper (MD3) + Lucide
- **DB** : Expo SQLite + **Kysely**, ORM maison à décorateurs (`@Entity/@Column`)
- **IA** : `onnxruntime-react-native` (modèles téléchargés via API backend, pas bundled)
- **Crypto** : `react-native-quick-crypto`, module natif `secure-recorder` (AES-256-GCM chunked)
- **Tests** : Jest (60 fichiers TS) + Kotlin/Swift natifs (38 fichiers)
- **Tooling** : pnpm workspaces, Biome, Storybook on-device, typesafe-i18n (en/fr)

---

## Ce qui fonctionne de bout en bout aujourd'hui

1. **Boot** : gate matériel (RAM/OS 64-bit) → redirection onboarding ou main
2. **Onboarding** : wizard 4 étapes (profil → compte → **calibrage voix réel** → recovery kit)
3. **Calibrage voix** : capture PCM 16 kHz → embedding CAM++ → **biocode projeté** persisté
4. **Home** : check modèles → téléchargement (gate Wi-Fi, fallback cellulaire, progression)
5. **Enregistrement** : mic natif → chiffrement GCM au vol → `.dat` sur disque + `Encounter` persisté (statut `ToProcess`)
6. **Outillage dev** (`src/Dev/` + `SEED.md`) : import de fichiers WAV/PCM externes convertis puis chiffrés en `.dat` **indistinguables d'un vrai enregistrement** ; création d'un thérapeute de test avec biocode réel

**Et là, ça s'arrête.** Rien ne déclenche la transcription après `stop()` ; les écrans Subjects et TranscriptDetail sont des mocks.

---

## Chantier en cours : interface Dev (fixtures audio)

**Objectif** : importer des fichiers audio open source et les transformer en `Encounter` chiffrés authentiques (stade `ToProcess`) pour exercer le pipeline d'analyse (VAD → ASR → diarisation) sans enregistrer de fausses séances au micro.

**Pivot vs `SEED.md`** : le plan initial (TTS macOS → playback haut-parleur → ré-enregistrement micro) a été **abandonné** au profit de l'import direct — le chiffrement natif s'applique directement au fichier importé. Les fichiers listés dans SEED.md (`DevSeedCoordinator`, `SyntheticDialogueGenerator`, `AudioPlaybackRecorder`) n'existent plus à créer ; `DevSeedException` est devenu `DevEncryptionException`. SEED.md reste utile pour le contenu des dialogues et le modèle de données cible.

**Briques terminées** (`src/Dev/`) :
- `DevAudioScanner` — scan d'un dossier de fichiers bruts (`.pcm`, `.wav`, `.aiff`, `.aif`, `.raw`)
- `DevAudioSegmentExtractor` + `WavHeader` — WAV (stéréo/44.1 kHz) → PCM 16 kHz mono
- `DevFileEncryptor` — chiffrement en `.dat` via `SecureRecorder.encryptFile/encryptBytes` → **indistinguable d'un enregistrement réel** (conversion WAV→PCM côté TS, chiffrement natif)
- `DevTherapistOnboarding` — thérapeute dev avec biocode extrait d'un segment audio (sans micro)
- `DevAudioScreen` / `DevAudioState` — UI scan → encrypt

**3 chaînons manquants** :
1. **Écran inatteignable** : la route `DevSeed` n'existe que dans `AppNavigator.tsx` (React Navigation, code mort). La vraie navigation est expo-router (`app/`), sans route dev. Le trigger « 5 taps » de `SettingsScreen` appelle le navigateur fantôme → no-op. À faire : `app/dev-seed.tsx` + `router.push('/dev-seed')`
2. **Fixtures orphelines** : `DevFileEncryptor` produit des `seed_xxxx.dat` sans créer `Encounter`/`Patient`/`QueueItem` → invisibles et jamais traitées. À faire : rattacher chaque `.dat` importé aux entités (status `ToProcess`)
3. **Onboarding dev non exposé** : `DevTherapistOnboarding` est enregistré dans le Container mais appelé par aucune UI. À faire : section « Dev Therapist » dans l'écran Dev

Prérequis : corriger l'export `registry` cassé dans `Database/index.ts` (voir Santé du code).

---

## État par domaine

### ✅ Solide / terminé

| Domaine | Détail |
|---|---|
| Module natif `secure-recorder` | Session, Pipeline, EncryptionStream (16 KB/GCM), StreamDecryptionManager, KeyManager (Keychain/Keystore), limites (4 h/500 MB), FileShredder. Isomorphe iOS/Kotlin, README solide |
| Vault & identité | `TherapistForge` (master key, double enveloppe password + recovery), `MasterKeyVault`, `RecoveryKit` (PDF/clipboard), `HardwareGuard` |
| ORM maison | Décorateurs + Kysely, CRUD générique, FTS5, transactions, schema sync additive |
| DI | `Container` statique (classe → factory), utilisé partout |
| Téléchargement modèles | `Downloader` (checksum, file persistée `DownloadQueue`, reprise) |
| Chaîne biocode | mel → CAM++ → projection (master key) → similarité cosinus 0,85 |
| API client | OpenAPI → hey-api généré, React Query, mock server json-server |

### 🚧 WIP

| Domaine | Détail |
|---|---|
| `SpeakerId` (CAM++) | Fonctionnel mais `config.yaml` non parsé (dimensions hardcodées 192/80) |
| Biocode | **Divergence spec** : AGENTS.md dit `Hash(SpeakerVector + Salt)` ; implémenté = projection vectorielle. À arbitrer |
| `Math/AudioFeatureExtractor` | Log-mel 80 bins en FFT mathjs « approximate » — TODO binding natif (kaldi-native-fbank/sherpa) |
| Incognito mode | Flag `Encounter.isIncognito` existe ; UX et flow (bunker) non faits |
| Checkpointing | `QueueItem.processingOffset` prêt ; orchestration du processing absent |

### ❌ Absent / stub

| Domaine | Détail |
|---|---|
| **ASR (Whisper)** | `AutomaticSpeechRecognizer.run()` → `"TODO: implement full transcription pipeline"`. Encoder/decoder non distincts, tokenizer absent. **C'est le blocage central** |
| VAD (Silero) & Pitch (CREPE) | Déclarés dans `Setup.CAPABILITIES` mais aucune classe ; `Runtime` ne gère que `speaker_id`/`asr` |
| Pipeline post-enregistrement | Rien ne consomme les `QueueItem` (repo vide) ; aucun déclenchement après stop |
| DSP client | `pcm16ToFloat32`, EBU R128 : non commencés (jitter/shimmer/HNR = server-side, OK) |
| Écrans résultats | `SubjectsScreen` (mock en dur), `TranscriptDetailScreen` (mock, download/share TODO), aucune liste d'encounters sur Home |
| `Context/ServicesProvider` | Passe 3 services tous `null` (`speakerProcessor`, `anonymizer`, `audioProcessing`) |
| Anonymisation (NER) | Référencée mais aucun service |
| Migrations DB | Absentes (schema sync additive seulement — pas de versioning/drop) |

---

## Santé du code

- **`pnpm run type-check` : 136 erreurs.** Majorité dans `tests/` (vieux tests driftés : `InferenceModelDownloader` renommé, mocks obsolètes). Mais aussi dans `src/` :
  - `Context/ServicesContext` importe `Service/Anonymizer` et `Service/AudioProcessing` qui **n'existent pas**
  - `Database/index.ts` exporte `registry` (n'existe pas, c'est `Registry`)
  - `Database/Type.ts` référence `AbstractEntity` non importé
  - `App.tsx` → `../assets/app/_layout` non résolu par tsc (fonctionne via Metro)
- **Tests** : 60 fichiers TS + 38 natifs — non vérifiés à cette date (à relancer : `pnpm test`, `test:kotlin`, `test:swift`)
- **Navigation : code mort.** `src/Navigation/AppNavigator` n'est importé nulle part (expo-router dans `app/` est la vraie navigation). Le geste dev « 5 taps » (`DevSeed`) cible l'ancien navigateur → **probablement cassé**
- **`CryptoEngine` (Security)** : AES-**CBC** + PBKDF2 **1 000 itérations** pour le vault — en tension avec la règle projet « AES-256-GCM ». À auditer
- `Container.initialize()` et `AppConfig.getInstance()` : double singleton, violation de la règle « passive holder » des AGENTS.md
- Divers : `RecordNormalizer` semble mort (duplique `Repository.normalizeForWrite`), `QueueItemRepository` coquille vide, exports `Repository/index.ts` incomplets, suffixes exceptions incohérents (`*Error` vs `*Exception`)

---

## État du dépôt (working tree)

90 commits depuis le 10 janvier 2026 ; messages récents peu explicites (« wip »). Modifs non commitées (~266 lignes) :

- **Session du 26/10 (refactor encryptFile)** : `secure-recorder` — `encryptFile` ramené à un pass-through simple, ajout de `encryptBytes(data, outputPath)` (Kotlin + Swift + TS). La conversion WAV→PCM 16 kHz mono reste côté TS via `DevAudioSegmentExtractor`
- **Antérieures, non commitées** : `Container.ts`, `Entity/index.ts`, `AutomaticSpeechRecognizer.ts`, `SpeakerId.ts`, `AppNavigator.tsx`, `Navigation/types.ts`, `SettingsScreen.tsx`, `Screen/index.ts`
- **Non trackés** : `src/Dev/` (outillage seeding), `SEED.md` (plan de peuplement : 6 encounters stade ToProcess pour exercer le pipeline), tests natifs `EncryptFile*`

---

## Prochaines étapes suggérées (priorisées)

1. **Commit/sort du working tree** — la session de refactoring `encryptBytes` + l'outillage `Dev/` sont stables, à figer avant d'attaquer autre chose
2. **Finir l'interface Dev (fixtures)** — les 3 chaînons manquants : route expo-router + trigger Settings, exposer `DevTherapistOnboarding`, rattacher les `.dat` importés aux entités `Encounter`/`QueueItem`. C'est le tremplin : sans fixtures réalistes, le pipeline n'est pas testable
3. **Implémenter l'ASR Whisper** — le stub `AutomaticSpeechRecognizer` est le blocage de toute la chaîne valeur. Avec les fixtures chargées, le test bout-en-bout devient possible sans micro
4. **Brancher le pipeline post-enregistrement** — consommer les `QueueItem` après `stop()` (charger → VAD → découpage → ASR → persistance `Transcription`)
5. **VAD + Pitch** — nouvelles classes `Runtime`, même pattern que `SpeakerId`
6. **Réparer la santé code** — imports cassés (`ServicesContext`, `Database/index`), navigation morte à supprimer ou recâbler, drift des tests
7. **Arbitrer les divergences spec** — biocode (hash vs projection), `CryptoEngine` (CBC → GCM ?), itérations PBKDF2

---

*Ce fichier est un instantané. Mettre à jour après chaque étape majeure.*
