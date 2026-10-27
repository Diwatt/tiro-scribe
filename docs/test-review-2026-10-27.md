# Revue des tests — 27/10/2026

> Revue complète des 59 suites du repo contre le skill **testing-best-practices** (34 règles : struct-, iso-, assert-, data-, mock-, cov-, perf-).
> Méthode : 5 revues en parallèle, lecture seule, une par sous-système. Aucun code modifié.
> État au moment de la revue : 640 tests verts / 661, 128 erreurs tsc (dette connue, hors périmètre).

---

## Synthèse

**Chiffres :** ~55 constats actionnables — 7 CRITICAL, 13 HIGH, ~25 MEDIUM, ~10 LOW.

**Les 7 constats CRITICAL :**

| # | Constat | Fichier |
|---|---|---|
| 1 | Le « vrai SQLite » annoncé par l'en-tête est un **fake à base de regex** dont `where()` ne capture pas la valeur → **7 `it.skip`** sur le cœur du Repository (WHERE, findOneBy, orderBy, pagination, transaction) | `tests/Database/Repository.test.ts` + `tests/helpers/kysely.ts` |
| 2 | **Doublon intégral** de `Download/ChecksumVerifier.test.ts` mais avec le crypto **mocké** — les asserts portent sur le mock, pas sur SHA-256 | `tests/InferenceModel/Model/ChecksumVerifier.test.ts` |
| 3 | `encrypt`/`decrypt`/`hash`/`randomKey`/`generateDeterministicBytes` de `CryptoEngine` **jamais testés** — à couvrir AVANT la migration GCM/600k itérations (P0) | `tests/Security/CryptoEngine.test.ts` |
| 4 | 3 `it.skip` sur la propriété de sécurité centrale du biocode (clés différentes → projections différentes) ; la justification du skip (« mock PBKDF2 doesn't differentiate ») est **fausse** : le crypto Node réel est branché | `tests/Math/ProjectionMatrixFactory.test.ts:109,127` + `Math.integration.test.ts:152` |
| 5 | Le « Encounter behavior test » teste un mock dont le schéma **diverge de l'entité réelle** (`participantBiocodes` n'existe pas ; `isIncognito`, `encryptedAudioPaths`, `totalDuration` ignorés) — vert par construction | `tests/Entity/Encounter.test.ts` |
| 6 | `OnboardingState.test.ts` : **5 tests sur 5 skippés** — le fichier n'exécute rien | `tests/State/OnboardingState.test.ts` |
| 7 | « Tests de composant » qui ne rendent **jamais** le composant : `AsyncButton` importé et jamais utilisé (tests de l'opérateur `??`), `GlobalActivityBar` re-teste la classe store | `tests/Components/` |

**Les 3 patterns transversaux :**

1. **Tests fantômes — le nom promet, le corps ne tient pas** (fausse confiance, le plus coûteux) :
   - « orders by primary key when no createdAt index » asserte seulement `length >= 2` (`Repository.test.ts:188`)
   - « should throw for Infinity dimensions » asserte `not.toThrow()` sur `(10, 5)` — Infinity jamais exercé (`ProjectionMatrixFactory.test.ts:281`)
   - « jsonPath containing single quote » testé avec `$.text`, sans quote (`DefinitionLanguageWriter.test.ts:214`)
   - « should throw on NaN values » asserté `not.toThrow()` (`AudioFeatureExtractor.test.ts:261`)
   - « uses cached parsed value » sans aucune vérification de cache (`AppConfig.test.ts:34`)
   - « checkPermission should update hasPermission observable » : la même assertion dupliquée 2×, l'observable jamais lu (`VoiceState.test.ts:178-194`)
   - « transition Pending → Downloading → Completed » : l'état est déjà `Completed` avant `start()` (`DownloadTaskExecutor.test.ts:209`)
2. **Le mock remplace l'unité testée** : `QueueItem.test.ts` **recopie** la logique `isProcessable` dans le test ; stub `@legendapp/state` dupliqué ~55 lignes ×2 ; `mockBiocodeFactory` qui est un vrai factory ; mock `metadataFromReaderLike` qui réimplémente la logique prod.
3. **Restauration d'état dans le corps du test au lieu de `afterEach`** : `AppConfig.isDev`, `Database.instance`, `metadata.getColumnDefaults`, `Device.isDevice` (le guard `if (!hasOwnProperty)` ne re-définit jamais après la première mutation → dépendance d'ordre réelle), fake timers non restaurés sur échec.

**Ce qui est bien fait (à préserver) :**

- **`tests/DevConsole/` — exemplaire** : factories de fixtures (`createDeps()`, `existingFile()`), chemins d'erreur systématiques avec preuve d'absence d'effets de bord aval.
- **`HardwareGuard` / `SystemVerifier`** : matrice de branches, le « 1 if = 1 test » réellement appliqué.
- **`Download/ChecksumVerifier.test.ts`** (créé le 27/10) : cité comme « le modèle du lot » — hash réel, chunks vérifiés, close sur les chemins d'erreur.
- **`VectorProjection`** : valeurs mathématiques exactes, exceptions typées du domaine.
- **`MetadataWriter`** : branches null/undefined/non-object en 3 tests distincts — l'esprit « 1 if = 1 test ».

**Verdicts par lot (1 ligne) :**
- **Database** : sain structurellement (ZOMBIE, erreurs typées) ; chantier = remplacer le fake Kysely par un vrai SQLite in-memory et dé-skipper les 7 tests noyau.
- **InferenceModel** : couverture nominal/erreurs correcte mais confiance gonflée (doublon, transition vacueuse, asserts plus faibles que les noms).
- **Decorator/Util/Config** : structurellement sain ; la couverture par branches décroche sur la vraie logique (accessor + garde isDev du Builder, enum/notBlank/min du SchemaValidator, chemin prod d'AppConfig) ; 3 doublons.
- **Math/Security/Entity** : squelette solide mais l'entité Encounter et le cœur de CryptoEngine ne sont pas réellement testés ; la propriété de sécurité du biocode n'a aucune preuve.
- **State/Components/Service/DevConsole** : DevConsole prêt, HardwareGuard/SystemVerifier solides ; OnboardingState ne teste rien, les composants ne sont pas rendus, VoiceState accumule des assertions fantômes.

---

## Lot 1 — `tests/Database/` (12 fichiers)

### Constats

| Priorité | Fichier:ligne | Règle | Constat (extrait court) | Correction proposée |
|---|---|---|---|---|
| **CRITICAL** | `Repository.test.ts:4, 103-232` | cov-* / struct-* | Header : *« Uses a real in-memory SQLite database via Kysely — no Kysely mocking »* — **faux**. Le backend est `tests/helpers/kysely.ts`, un fake qui ré-interprète le SQL par regex, et dont `where()` ne capture jamais la valeur (`whereVal` reste `null`, L180-196). Conséquence : **7 `it.skip`** couvrant le cœur du Repository — `findBy` avec critères WHERE, `findOneBy` filtré, `orderBy` en lecture, pagination `limit/offset`, `transaction`. | Remplacer le fake par un vrai SQLite in-memory (dialecte Kysely sur `better-sqlite3 ':memory:'` ou `sql.js`) et dé-skipper les 7 tests. La cause racine des skips est la limite du fake, pas de Kysely. En attendant, corriger au minimum `where()` pour capturer la valeur. |
| **HIGH** | `Schema/DefinitionLanguageWriter.test.ts:214-228` | assert-* / cov-* | Test nommé *« jsonPath containing single quote escapes it in SQL »* mais l'input est `jsonPath: "$.text"` — **aucune quote**. L'assertion (`toContain("$.text")`) ne vérifie aucun échappement. | Utiliser un jsonPath contenant réellement une quote (ex. `$.a'b`) et assertérer le SQL échappé (`''` doublé) produit par le writer. |
| **HIGH** | `Schema/DefinitionLanguageWriter.test.ts:257-296, 504-541` | iso-* | Le mock `AppConfig` est basculé en `isDev: true` puis réinitialisé **en fin de corps de test** (L292-296, L537-541). Si un `expect` échoue avant, `isDev` reste `true` pour tous les tests suivants du fichier → dépendance d'ordre. | Déplacer la restauration dans un `afterEach`, ou créer le writer avec un AppConfig injecté plutôt que de muter le mock module. |
| **HIGH** | `Repository.test.ts:188-194` | assert-* | *« orders by primary key when no createdAt index »* : aucune assertion d'ordre — seulement `expect(list.length).toBeGreaterThanOrEqual(2)` et `toBeInstanceOf(Collection)`. | Insérer 2 entités avec des uuid connus et assertérer l'ordre du résultat. |
| **HIGH** | `Repository.test.ts:293` | iso-* | `r.metadata.getColumnDefaults = () => defaults` mute l'instance **partagée** : `EntityMetadata.for()` est cachée par constructeur. La mutation fuit sur tous les tests suivants. | Restaurer dans le test, ou construire un `Repository` avec une instance `EntityMetadata` fraîche. |
| **HIGH** | `QueryCompiler.test.ts:44-48, 58-65, 107-111` | assert-* | 3 tests dont l'assertion ne vérifie pas le comportement promis : « WHERE on FK column » n'assert que `toContain('where')` ; « uses given column and direction » ne vérifie ni colonne ni direction ; « lowercases DESC/ASC » ne vérifie pas `desc` dans le SQL. | Assertérer le SQL compilé : `toMatch(/therapist_id\s*=\s*\?/i)`, `toMatch(/order by\s+"?therapist_id"? desc/i)` etc. |
| **MEDIUM** | `Registry.test.ts:38-52 vs 84-98` | struct-* | Blocs Z et E quasi identiques : `ENTITY_NAME_REQUIRED` testé 2×, « empty string » testé 2×. `async` sans `await` (L38, L56, L66, L74). | Supprimer les doublons du bloc Z et retirer `async` des callbacks synchrones. |
| **MEDIUM** | `AbstractEntity.test.ts:21-24 vs 102-105` | struct-* | Même test dupliqué dans Z et E, code identique. | Garder une seule occurrence (bloc E). |
| **MEDIUM** | `Schema/DefinitionBuilder.test.ts:80-94 vs 379-393, 96-108 vs 110-116` | struct-* | 2 paires de doublons. | Fusionner : garder la version qui asserte `code === 'ENTITY_METADATA_REQUIRED'`. |
| **MEDIUM** | `Criteria.test.ts:57-81` | mock-* / struct-* | Tests des méthodes **privées** `isScalar`/`requireNamesInAllowlist` via `(Criteria as any)`. | Supprimer le bloc internals ; couvrir via la surface publique. |
| **MEDIUM** | `Database.test.ts:63-72` | assert-* / cov-* | *« …and clears instance »* n'asserte rien sur `Database.instance` ; chemin d'erreur `getConnection()` sans init non testé. | Assertérer `instance` null après `reset()` ; + test `DatabaseException` quand non initialisé. |
| **MEDIUM** | `Schema/DefinitionBuilder.test.ts:47-59` | mock-* | `metadataFromReaderLike` **réimplémente** la logique de résolution FK de la prod. | Réutiliser `EntityMetadata.for(realClass)` + helpers existants. |
| **LOW** | `RecordNormalizer.test.ts:91-99` | cov-* / struct-* | Bloc « E — Exceptions » ne teste aucune exception. | Renommer ou tester les vrais guards. |
| **LOW** | `Repository.test.ts:283-351` | struct-* | 5 méthodes privées testées via `as any` + monkey-patching. | Acceptable ; se règle avec le vrai SQLite. |

### Patterns récurrents
1. Le nom décrit plus que l'assertion.
2. Doublons ZOMBIES entre blocs Z et E.
3. Restauration d'état dans le corps du test plutôt qu'en `afterEach`.

---

## Lot 2 — `tests/InferenceModel/` (12 fichiers)

**Doublon confirmé : les deux `ChecksumVerifier.test.ts` (`Download/` et `Model/`) testent la même classe, le même module importé.**

### Constats

| Priorité | Fichier:ligne | Règle | Constat | Correction proposée |
|---|---|---|---|---|
| **CRITICAL** | `Model/ChecksumVerifier.test.ts` (entier) | struct-* | Doublon intégral avec crypto **mocké** (`mockHash`) → asserts sur le mock, pas le SHA-256 ; dérive garantie entre les 2 suites | Supprimer ce fichier ; porter le seul scénario manquant (« close sur erreur mid-read », L168-182) dans `Download/ChecksumVerifier.test.ts` |
| **HIGH** | `Model/DownloadTaskExecutor.test.ts:209-225` | struct-* | « should transition through Pending → Downloading → Completed » : l'état est **déjà `Completed` avant `start()`** (mock `createCompleted`) — aucune transition observée | Queue réelle en `Pending`, collecter les états via `executor.state$` avant `start()` |
| **HIGH** | `Model/DownloadTaskExecutor.test.ts:380-393` | cov-* | `cancel()` : seule la branche `false` testée. Le chemin réel (cancel pendant `Downloading` → `Cancelled`) jamais couvert | Promise éternelle + `cancel()` + attendre `DownloadState.Cancelled` + `getError()` |
| **HIGH** | `Runtime.test.ts:58-107` | cov-* | Branches non testées de `Runtime.load` : fallback `downloader.download`, throw « not available », throw « Unknown model capability » ; `runRaw` après `release` | 4 tests, et remplacer les accès `(runtime as any).sessions` |
| **MEDIUM** | `Speaker/SpeakerEmbedder.test.ts:61-69` | assert-* | Normalisation unitaire et `confidence = clamp(magnitude, 0, 1)` jamais assertées — le cœur métier | Assert `closeTo(0.267…)` et `confidence toBeCloseTo(0.374)` ; + vecteur nul |
| **MEDIUM** | `Speaker/SpeakerEmbedder.test.ts:54-59` | struct-* | Le rejet vient du mock `getModel`, pas d'un état non initialisé — nom mensonger | Renommer « wraps runtime failure… » |
| **MEDIUM** | `Speaker/SpeakerVector.test.ts` | cov-* | 223 lignes pour une classe data de 6 lignes ; tests de sémantique JS (`typeof`, `Array.isArray`) | Réduire à ~4 tests réels |
| **MEDIUM** | `Speaker/SpeakerProcessor.test.ts:73-81` | struct-* | « without touching disk » : aucune assertion disque — duplication affaiblie. `mockBiocodeFactory` = vrai factory | Supprimer ; renommer la variable |
| **MEDIUM** | `Model/FileDownloader.test.ts:172-182` | cov-* | Le regex matcherait aussi le message wrappé — le rethrow n'est pas distingué du wrap | Ancre : `rejects.toThrow(/^Download completed but file does not exist/)` |
| **LOW** | `Speaker/VoiceCalibrator.test.ts:50, 22-44` | assert-* | Import `SecureRecorder` inutilisé ; mock `Container` mort (deps injectées) | Supprimer |
| **LOW** | `Runtime.test.ts:36` | assert-* | Import inutilisé | Supprimer |
| **LOW** | `Model/DownloadTaskExecutor.test.ts:31-48` | mock-* | Mocks de module redondants avec fakes déjà injectés | Ne garder que le mock `FileDownloader` |
| **LOW** | `Model/InferenceModelDownloader.test.ts:467-501` | cov-* | Zombie tautologique (le mock renvoie ce qu'on lui a dit) | Supprimer |

### Patterns récurrents
1. En-têtes méthodologiques non tenus par le contenu (ZOMBIE, « contract focused », transitions).
2. Doubles incohérents du même collaborateur (`Runtime` mocké avec 2 contrats différents selon les fichiers).
3. Empilement « mock de module + injection constructeur ».

---

## Lot 3 — `tests/Decorator/` + `tests/Util/` + `tests/Config/` (10 fichiers)

### Constats

| Priorité | Fichier:ligne | Règle | Constat | Correction proposée |
|---|---|---|---|---|
| **HIGH** | `tests/Util/Timer.test.ts:5-18` | iso-cleanup | `useFakeTimers()` restauré **en fin de `it`** — fuite si échec | `afterEach(() => { jest.useRealTimers(); })` |
| **HIGH** | `tests/Decorator/SchemaValidator.test.ts:72-76` | assert-specific | `try/catch` : si le validateur ne throw plus, le `catch` ne s'exécute jamais et le test reste **vert** | Capturer puis assert `toBeInstanceOf` + code ; scinder en 3 (type/message/code) |
| **HIGH** | `tests/Decorator/FieldDecorator.test.ts` | struct-* | **Fichier doublon** : 7 tests identiques à `PropertyDecorator.test.ts` (qui en a 2 de plus) | Supprimer `FieldDecorator.test.ts` |
| **HIGH** | `tests/Decorator/Builder.test.ts` | cov-edge-cases | La branche `kind === 'accessor'` (moitié du contrat de `buildProperty`) : **aucun test** | Ajouter le test accessor |
| **MEDIUM** | `MetadataReader.test.ts:12-25`, `MetadataWriter.test.ts:6-19` | mock-minimal | `jest.mock('@/Core/AppLogger')` mort — jamais atteint | Supprimer |
| **MEDIUM** | `Builder.test.ts:55-61, 115-126` | struct-one-assertion | `toThrow` + `not.toThrow` dans le même `it` | Un `it` par branche |
| **MEDIUM** | `Builder.test.ts` | cov-unhappy-paths | La garde `if (!isDev) return;` jamais testée (validation désactivée en prod) | Mocker `isDev: false` + vérifier non-appel du validateur |
| **MEDIUM** | `AppConfig.test.ts:20-32` | struct-one-assertion | 3 scénarios dans un `it` | `it.each` |
| **MEDIUM** | `AppConfig.test.ts:34-40` | struct-descriptive-names | « uses cached parsed value » ne vérifie aucun cache | Tester le vrai contrat (valeur figée au constructeur) |
| **MEDIUM** | `AppConfig.test.ts` | cov-edge-cases | Branche prod de `parseEnv` non couverte | `describe` dédié avec `__DEV__ = false` |
| **MEDIUM** | `ClassDecorator.test.ts:26-28` | assert-specific | Promet `getOption`, appelle `getOptions` casté | `expect(d.getOption('unknown')).toBeUndefined()` |
| **MEDIUM** | `ClassDecorator.test.ts:9-12 vs 21-24` | struct-* | 2 `it` vérifient le même comportement | Supprimer le premier |
| **MEDIUM** | `SchemaValidator.test.ts` | cov-edge-cases | `enum`, `notBlank`, `integer`/`min` jamais testés | ~6 tests, une branche chacun |
| **LOW** | `MetadataReader.test.ts:36-44` vs `MetadataWriter.test.ts:23-38` | struct-* | Scénario `registerClass`→`read` dupliqué cross-file | Garder dans MetadataWriter |
| **LOW** | `MetadataReader.test.ts:1-5` | iso-deterministic | Polyfill `Symbol.metadata` redondant avec `jest.setup.symbols.ts` | Supprimer |
| — | `Builder.test.ts:129` | tsc | `MetadataMap` sans import (déjà compté dans la dette tsc) | Fix avec le chantier tsc |

### Patterns récurrents
1. Duplication de tests/fichiers.
2. Multi-scénarios dans un seul `it` (la règle « 1 if = 1 test » bien appliquée dans `MetadataWriter` montre la voie).
3. Nom du test ≠ contenu vérifié.

---

## Lot 4 — `tests/Math/` + `tests/Security/` + `tests/Entity/` + `tests/Exception/` (12 fichiers)

### Constats

| Priorité | Fichier:ligne | Règle | Constat | Correction proposée |
|---|---|---|---|---|
| **CRITICAL** | `tests/Security/CryptoEngine.test.ts` | cov-* | Seuls `salt`/`keyFromPassword` testés. `encrypt`/`decrypt`/`hash`/`randomKey`/`generateDeterministicBytes` sans aucun test ; rien ne verrouille algorithme ni itérations | Round-trip, mauvaise clé, format `IV‖ciphertext`, déterminisme `generateDeterministicBytes` — filet pour la migration GCM/600k (P0) |
| **CRITICAL** | `tests/Math/ProjectionMatrixFactory.test.ts:109,127` + `Math.integration.test.ts:152` | mock-*, tension crypto | 3 `it.skip` (« mock PBKDF2 doesn't differentiate ») — **faux** : le crypto Node réel est branché (`jest.setup.ts:81-89`). La propriété de sécurité du biocode n'est prouvée nulle part | Réactiver les 3 tests ; s'ils échouent encore, bug réel à investiguer — pas à skipper |
| **CRITICAL** | `tests/Entity/Encounter.test.ts:11-21` + `tests/helpers/mockEntity.ts:34-44` | mock-* | Le mock diverge du schéma réel : verrouille `participantBiocodes` (n'existe pas), ignore `encryptedAudioPaths`, `isIncognito`, `totalDuration` | Instancier le vrai `Encounter` (fait dans `Therapist.test.ts:25`) ou aligner le mock |
| **HIGH** | `tests/Entity/QueueItem.test.ts:10-18` | mock-* | La logique `isProcessable` **recopiée dans le test** ; bug latent : l'entité ignore `maxRetries` | Tester le getter réel (modèle `Therapist.test.ts`) |
| **HIGH** | `tests/Math/ProjectionMatrixFactory.test.ts:44-47,266-269` | assert-* | Verrouille que master key vide/`null`/`undefined` est **acceptée** — biocode dégénéré sans erreur | Inverser le contrat après ajout d'une garde côté source |
| **HIGH** | `tests/Math/ProjectionMatrixFactory.test.ts:281-292` | assert-* | « should throw for Infinity dimensions » teste `create(masterKey, 10, 5)` avec `not.toThrow()` | Renommer ; tester le vrai `toThrow` si garde ajoutée |
| **HIGH** | `tests/Math/AudioFeatureExtractor.test.ts:261-271` | assert-* | « should throw on NaN/Infinity » avec `not.toThrow()` | Renommer « handles gracefully » |
| **HIGH** | `tests/Math/Math.integration.test.ts:414-433` | perf-* | `expect(duration).toBeLessThan(1000)` alors que le TODO du test documente ~2700 ms — rouge ou flaky | Bench dédié taggué, retiré de la suite rapide |
| **MEDIUM** | `ProjectionMatrixFactory.test.ts:352-371` | assert-* | Assertion mémoire **morte** : `performance.memory` n'existe pas sous Node — le test ne vérifie rien | Supprimer ou mesurer les données allouées |
| **MEDIUM** | `ProjectionMatrixFactory.test.ts:213-230` | assert-* | « should use default configuration salt » n'observe jamais le salt | Comparer default vs salt différent → `not.toEqual` |
| **MEDIUM** | `VectorProjection.test.ts:258-264` | assert-* | `Number.isFinite(x) \|\| Number.isNaN(x)` — tautologie | Assert le contrat exact (`toBeNaN`) |
| **MEDIUM** | `VectorProjection.test.ts:222-224` | struct-* | `[]` → throw, `[[]]` accepté — incohérence de contrat verrouillée | Trancher le contrat |
| **MEDIUM** | `AudioFeatureExtractor.test.ts:273-278` | struct-* | Verrouille l'absence totale de validation du constructeur (`sampleRate 0/-1` acceptés) | Trancher le contrat |
| **MEDIUM** | `tests/Security/RecoveryCode.test.ts:15-19` | cov-* | Pas de « codes différents → clés différentes » — propriété de sécurité du recovery vault | Ajouter les 2 tests de différenciation |
| **LOW** | `AudioFeatureExtractor.test.ts:249-251,273-278` | struct-* | `null`+`undefined` dans un test ; `toThrow()` nu | 1 entrée = 1 test, exception typée |
| **LOW** | `tests/Exception/RecordingTooShortError.test.ts:5-9` | assert-* | Pas de `toBeInstanceOf(Error)` (garde chaîne de prototypes) | Ajouter |
| **LOW** | `AudioFeatureExtractor.test.ts:291` | perf-* | Timeout 10 s sur un test unitaire | Réduire les paramètres extrêmes |

### Patterns récurrents
1. Noms qui contredisent les assertions.
2. Le mock remplace l'unité testée.
3. `not.toThrow()` bénit l'absence de gardes (verrouille des contrats dangereux).

---

## Lot 5 — `tests/State/` + `tests/Components/` + `tests/Service/` + `tests/DevConsole/` (13 fichiers)

### Constats

| Priorité | Fichier:ligne | Règle | Constat | Correction proposée |
|---|---|---|---|---|
| **CRITICAL** | `tests/State/OnboardingState.test.ts:129-182` | cov-* | **5 tests sur 5 skippés** — le fichier n'exécute rien | Dé-skiper et réparer (le stub du `beforeEach` suffit) ; ou supprimer le fichier |
| **CRITICAL** | `tests/State/VoiceState.test.ts:248-259` | assert-* | « reset should clear hasPermission » n'assert rien (`typeof … === 'function'`) | `set(true)` → `reset()` → `expect(get()).toBe(false)` |
| **CRITICAL** | `tests/Components/AsyncButton.test.tsx:15-51` | cov-* | Le composant n'est **jamais rendu** — les 3 tests recodent la logique (`??` + `getLabel`) ; `AsyncButton` importé jamais utilisé | Rendre le composant (bloqué par l'infra RNTL, cf. TODO P7) ou renommer en `getLabel.test.ts` |
| **HIGH** | `tests/State/VoiceState.test.ts:178-194` | assert-* | 4 tests « should update observable » qui ne lisent jamais l'observable ; L183 = L185 dupliquée | `expect(voiceState.hasPermission.get()).toBe(true/false)` |
| **HIGH** | `tests/Service/VoiceCalibrationRecorder.test.ts:27-32` | iso-* | Guard `isDevice` : après la mutation du test simulator, jamais réinitialisé → dépendance d'ordre réelle | `beforeEach` avec `defineProperty` **inconditionnel** |
| **HIGH** | `tests/State/VoiceState.test.ts:99` | iso-* | `therapist` partagé au niveau module et **muté par le SUT**, jamais réinitialisé | Créer dans le `beforeEach` |
| **HIGH** | `tests/State/StartupOrchestrator.test.ts:118,131` | iso-* | Pollution de `global` sans cleanup | Appeler la closure locale directement |
| **HIGH** | `tests/Service/HardwareGuard.test.ts:273-285` | struct-* | 2 tests dupliqués exacts (L69-72) + mutation du scope parent ; `ensureCompatible` jamais testé | Supprimer les duplicatas ; tester `gate.ensureCompatible()` |
| **HIGH** | `VoiceState.test.ts:5-58` + `OnboardingState.test.ts:3-56` | mock-* | Stub `@legendapp/state` dupliqué (~55 lignes ×2) ; le stub affaiblit les tests (commentaire qui l'admet) | Manual mock partagé `__mocks__/` ; à terme la vraie lib |
| **MEDIUM** | `GlobalActivityStatus.test.ts:19-33` | cov-* | 2 tests sur 5 testent la **lib tierce** | Supprimer |
| **MEDIUM** | `StartupOrchestrator.test.ts:68-97` | struct-* | 2 tests parcourent la même séquence ; regex tolérante ; commentaires contradictoires | Fusionner en un scénario |
| **MEDIUM** | `VoiceState.test.ts:120-136` | struct-* | Recréation inutile de `VoiceState` (mock passé par référence) | Supprimer |
| **MEDIUM** | `VoiceCalibrationRecorder.test.ts` (7 occurrences) | data-* | `fakeRecorder` copié-collé **7×** | Factory `createFakeRecorder()` |
| **MEDIUM** | `VoiceCalibrationRecorder.test.ts:219` | mock-* | Réassignation brute du module non restaurée | `jest.spyOn(...).mockRejectedValueOnce` |
| **MEDIUM** | `HardwareGuard.test.ts:20` | mock-* | Vraie instance `AppLogger` avec config partielle — logs réels en sortie | Stub logger comme ailleurs |
| **MEDIUM** | `SystemVerifier.test.ts:84-93` | struct-* | « promise-returning » avec méthode **synchrone** | `async` réel ou renommer |
| **LOW** | `GlobalActivityBar.test.tsx:37-65` | cov-* | Re-teste `readFromStore` (déjà couvert) | Rendre le composant ou renommer |
| **LOW** | `GlobalActivityBar.test.tsx:8-15,25` | assert-* | `expect(colors).not.toBeNull()` ne prouve pas la bonne palette | Identité de référence `toBe(fakeTheme.colors.statusError)` |
| **LOW** | `SystemVerifier.test.ts:18` | projet | Import relatif contournant l'alias `@/` | Alias |

### Patterns récurrents
1. Tests fantômes (nom ≠ corps).
2. Duplication de fixtures au lieu de factories (DevConsole montre la bonne voie).
3. Setup en double couche (registre puis spy sur le même mock).

---

## Plan de correction proposé (à intégrer au TODO §P7)

**Vague A — Restaurer la confiance (CRITICAL, ~2 j)**
1. `tests/helpers/kysely.ts` → vrai SQLite in-memory + dé-skipper les 7 tests Repository.
2. Supprimer `Model/ChecksumVerifier.test.ts` (doublon mocké) ; porter « close sur erreur mid-read » dans `Download/`.
3. Couvrir `CryptoEngine` (round-trip, mauvaise clé, format, déterminisme) **avant** la migration GCM (P0).
4. Réactiver les 3 skips Math (propriété biocode) — si rouge, investiguer.
5. Dé-skiper `OnboardingState` ; réécrire `Encounter`/`QueueItem` sur les vraies entités.
6. Réparer le test de transition `DownloadTaskExecutor` + couvrir `cancel()` en cours + 4 chemins d'erreur `Runtime`.

**Vague B — Honnêteté des tests (HIGH, ~1,5 j)**
Renommer/assert les tests fantômes (Database `:188`, QueryCompiler, ProjectionMatrixFactory, AudioFeatureExtractor, AppConfig, VoiceState permissions/reset, DownloadTaskExecutor transition), inverser les contrats dangereux (`not.toThrow` sur gardes manquantes), `try/catch` SchemaValidator, hooks `afterEach` pour les restaurations en corps de test.

**Vague C — Hygiène (~1 j)**
Supprimer les doublons (FieldDecorator, blocs Z≡E, MetadataReader vs Writer, GlobalActivityStatus), extraire le stub Legend-State partagé, factories (`fakeRecorder` ×7), mocks morts, tests de lib tierce.
