# TECH — État de l'art technique

> Créé le 2026-10-26 · complément technique de `STATE.md` (aucun overlap fonctionnel)
> Sources : registre npm interrogé le 26/10/2026 · changelogs officiels Expo SDK 56, 57, 58 (expo.dev) · inspection du repo (lockfile, podspecs, plugins, patches)

---

## 0. Journal de migration — SDK 58 RÉALISÉ (26/10/2026)

La migration 55 → 56 → 57 → 58 a été exécutée le jour même. État atteint :

| | Avant | Après |
|---|---|---|
| Expo SDK | 55.0.23 | **58.0.19** |
| React Native | 0.83.6 | **0.88.0** (Hermes ≥ fix mémoire #46519) |
| React / react-dom | 19.2.0 | **19.3.0** |
| reanimated / worklets | 4.2.3 / 0.7.4 | **4.7.1 / 0.13.0** |
| TypeScript | 5.9.3 | **6.0.3** |
| kysely-expo | 5.0.0 | **56.0.0** |
| Jest (baseline) | 51 suites / 599 tests verts | **identique** ✅ |
| Bundle iOS (Metro + hermesc) | — | **compile et exporte** ✅ |
| prebuild natif + pods | SDK 55 | SDK 58, deploymentTarget **16.4** ✅ |
| `useHermesV1` | forcé | **retiré** (v1 = défaut RN 0.88) |
| CI / engines Node | 20 | **24 / ≥22.13** |

### Changements structurants effectués

1. **Patch babel-preset régénéré** : `patches/@react-native__babel-preset@0.85.3.patch` (le bug `plugin-transform-classes` × decorators 2023-05 persiste upstream en 0.85.3 — version toujours embarquée par RN 0.86/0.88). L'ancien patch 0.83.6 supprimé.
2. **`babel.config.js` réorganisé** (l'upgrade de `@babel/plugin-transform-typescript` livré avec SDK 56 casse les champs `id!: number` décorés — "Definitely assigned fields cannot be initialized here") :
   - `@babel/plugin-syntax-jsx` en tête (kysely-expo@56 publie du JSX dans des `.js`) ;
   - `@babel/plugin-transform-typescript` en **premier plugin** avec `{ isTSX: true, allExtensions: true }` — le TS est strippé avant les decorators (les plugins passent avant les presets, les overrides passent APRÈS les plugins top-level : l'override ciblé `.ts$` ne fonctionne pas ici) ; sans `isTSX`, la syntaxe typescript désactive le parsing JSX des `.js`.
3. **Nouveau patch `kysely@0.28.17`** : `FileMigrationProvider` contient un `await import(/* webpackIgnore: true */ chemin calculé)` que Metro 58 refuse de compiler pour Hermes ("Invalid call"). Le provider lit le disque local — inutilisable sur device, non utilisé par l'app (tiré par le ré-export `Migrator` de l'index kysely). Le patch neutralise le dynamic import avec une erreur explicite.
4. **Purge `@react-navigation`** (SDK 56 a forké expo-router) : 3 deps retirées, `src/Navigation/` supprimé, `SettingsScreen` et `DevAudioScreen` migrés vers `useRouter` d'expo-router. ⚠️ Le trigger 5-taps existe toujours dans le SettingsScreen `src/` — à recâbler dans `app/main/(tabs)/settings.tsx` (déjà listé comme chaînon manquant dans STATE.md).
5. **Overrides pnpm mis à jour** (`pnpm-workspace.yaml`) : react/react-dom/react-test-renderer → 19.3.0 ; **override `hermes-compiler` supprimé** (RN 0.88 gère sa version — l'ancien pin 250829098.0.4 aurait cassé le bytecode).
6. **`app.json`** : `jsEngine` retiré (propriété supprimée du schéma SDK 58), deploymentTarget 16.4.
7. **`metro.config.js`** : `unstable_enableSymlinks` retiré (intégré à @expo/metro-config depuis SDK 56).
8. **Jest** : mock `expo-modules-core` supprimé de `jest.setup.ts` (avec SDK 56, jest-expo installe le runtime `expo/fetch` qui a besoin du vrai `requireNativeModule` — le mock faisait crasher toutes les suites), fallback `global.fetch` supprimé (le getter paresseux `expo/fetch` crashait au simple `typeof`), mock logger typé (TS 6 inférence circulaire).
9. **`tsconfig.json`** : `baseUrl` supprimé (déprécié TS 6), `lib: ["ESNext", "DOM"]` (pour `BodyInit`), paths relatifs `./src/*`.
10. **`src/Screen/Onboarding/StepVoice.tsx`** : `StyleSheet.absoluteFillObject` → `absoluteFill` (retiré des types RN 0.88).
11. **secure-recorder** : podspec deploymentTarget 16.4, peerDependencies alignées (`expo ~58`, `RN 0.88.0`), `expo-modules-core` en devDependency du module (satisfait le peer sans dep root — les deux checks expo-doctor contradictoires étant donnés).⚠️ le binaire `expo-module` doit s'exécuter via `pnpm exec expo-module` (le nom npm est un placeholder anti-confusion) — `pnpx` ne marche plus.
12. **Icônes internes react-native-paper migrées** : `@expo/vector-icons` (déprécié, et surtout retiré des deps d'`expo` depuis SDK 56 — d'où les warnings `Tried to use the icon 'check'` et les glyphes □ invisibles) remplacé par `@react-native-vector-icons/material-design-icons@14`. Paper v5.15 requiert le paquet scopé **en premier** (`MaterialCommunityIcon.tsx` : scoped → expo → react-native-vector-icons), le swap est donc transparent : aucun import ni config dans le code app, pas de config plugin Expo requis (Paper utilise l'entrée dynamique qui charge la font `MaterialDesignIcons.ttf` depuis le bundle JS via expo-font/expo-asset ; le plugin ne sert qu'à l'entrée `/static`, non utilisée). Glyphes vérifiés présents dans le glyphmap (`check`, `checkbox-blank-outline`, `checkbox-marked`). Validé sur émulateur (chip check + checkboxes onboarding basculent, zéro warning console) et Jest 599 verts. Le fix temporaire `@expo/vector-icons@15.1.1` en deps root est retiré.
13. **Decorators rendus au preset expo (`decorators: { version: '2023-05' }`, PAS en `plugins[]`)** — régression silencieuse de la migration, découverte au chantier seeding (26/10). Symptôme : sur device, `therapist.getUuid()`, `getEmail()`, `isValidPassword()`… renvoyaient `undefined` sur **toutes les entités rechargées** (le persist passait : il lit `fieldValues`), et tout `entity.champ = x` direct écrivait une data property sans toucher `fieldValues` (FK perdues en DB). Cause : avec les decorators en `plugins[]`, ils s'exécutent **avant** le preset expo, donc les lazy-plugins du preset (`expo-lazy-class-properties`, qui n'active class-properties loose que pour les fichiers à fields décorés) ne détectent plus jamais les decorators → les fields décorés restent des class fields natifs Hermes en sémantique **define** : chaque `@Column() public uuid!: string;` génère `uuid = _init_uuid(this)` et Hermes `defineProperty(this, 'uuid', undefined)` **après** `super()`, écrasant les accessors posés par `ensureColumnAccessors`. Correction dans le preset (`decorators: { version: '2023-05' }`) + garde anti-`undefined` dans le setter de `ColumnDecorator.initializer` (même logique que le setter proto d'`AbstractEntity`). ⚠️ Toujours vérifier sur device après toute config Babel : **Metro ne relit pas `babel.config.js` à chaud** — le cache de transformation sert l'ancien résultat même après reload/Fast Refresh ; redémarrer Metro avec `--reset-cache` (`stop-metro` puis `pnpm exec expo start --dev-client --port 8081 --reset-cache`). Diagnostic reproducible en local : `babel.transformSync(code, { filename: '<projet>/src/.../*.ts', configFile: true })` et vérifier que les fields décorés deviennent `this[key] = _init_x(this)` dans le constructeur (et non des class fields natifs).

14. **Entités migrées vers les auto-accessors TS (`public accessor x!: T`) + TypeScript 7.0.2** — suite directe du point 13 : chaque champ décoré déclare désormais ses accessors nativement (mot-clé `accessor`) au lieu de dépendre du wiring a posteriori d'`ensureColumnAccessors`. Infrastructure : `PropertyDecoratorConfig.accessor?(context, options)` + `initializer` optionnel + factory générique `PropertyDecoratorFactory<This, Value>` (la surcharge non-générique `ClassAccessorDecoratorResult<unknown, unknown>` casse en TS1270) dans `src/Decorator/Type.ts` ; branche `context.kind === 'accessor'` dans `buildProperty` (`src/Decorator/Builder.ts`) ; méthode `ColumnDecorator.accessor()` qui délègue get/set à `fieldValues` (transformer fromStorage/toStorage + garde anti-`undefined`) dans `src/Database/Decorator/Column.ts` ; `ensureColumnAccessors` skippe les champs portant déjà get/set sur le proto pour ne wire que les plain fields restants (`src/Database/AbstractEntity.ts`). Les 7 entités migrées (`Therapist`, `Encounter`, `Patient`, `QueueItem`, `DownloadQueue`, `ProsodyMetrics`, `Transcription`) — le `!` reste requis sur les auto-accessors (`accessor x:` sans `!` → TS2564). TypeScript 7.0.2 (compilateur Go, `pnpm exec tsc`) en place, baselines conservées : type-check 134, Jest 620 verts. **Validé sur device** (26/10, Pixel_7) : cycle complet Scan → Encrypt → Create Dev Therapist (biocode CAM++ 128 dims persisté via accessors) → Seed → snackbar succès → SQLite vérifiée (`totalDuration=3000` exact, FK encounter→therapist et patient→encounter correctes, queue_item pending/waiting pointant sur le `.dat` fraîchement encrypté).

### Résidus connus, non bloquants

- `expo-doctor` : 4 checks en échec, tous cosmétiques ou dev-only (script `storybook` vs binaire ; duplicate safe-area-context via `@storybook` devOnly ; faux positif non-CNG post-prebuild).
- **`@expo/dom-webview` / `@expo/metro-runtime` épinglés en deps root** (58.0.2 / 58.0.15) : le lockfile pnpm figeait ces transitives en 55 via des cycles de peer-variations que `pnpm update`/overrides ne ré-évaluent pas. ⚠️ **Ce n'est pas cosmétique** : le module natif Android d'une version incompatible s'enregistre au boot et crash l'app (`NoClassDefFoundError: AnyTypeProvider` — API Kotlin refactorée en SDK 58). Si les versions dérivent à nouveau, le symptôme est un crash au lancement de l'instance React.
- **Compatibilité 16 KB page size** (Android 15/16) : l'APK tourne en mode compatibilité — les seules libs confirmées non alignées sont les AAR Microsoft ONNX (`onnxruntime`, `onnxruntime_extensions4j_jni`, `onnxruntimejsi` : `LOAD segment not aligned`), le reste de la liste du checker étant des erreurs d'analyse. Non bloquant en dev ; **bloquant pour Google Play** (obligatoire Android 15+) → avant distribution : vérifier les variants 16 KB des AAR Microsoft, épingler, re-vérifier avec `check-elf-alignment`.
- **Build natif Android réalisé** (26/10 : app compilée, installée et lancée sur émulateur Pixel_7 — boot, onboarding interactif, zéro warning console). **Build natif iOS complet (`pnpm ios:dev`) restant à exécuter** — la validation ultime (SceneDelegate SDK 58 + inférence CAM++ réelle).

---

## TL;DR

**La migration est faite** : Expo 55 → 58 et RN 0.83.6 → 0.88 exécutées le 26/10/2026 en une journée (journal complet en §0). L'app tourne au niveau SDK 58 : Hermes V1 par défaut (flag retiré), reanimated 4.7 / worklets 0.13, TS 6, CI Node 24. Baseline Jest préservée (599 verts) et validation device Android OK (boot + onboarding, zéro warning).

Sur les contournements « on the edge » (§2) : le forçage Hermes V1 est **résolu** par la migration ; le patch babel-preset reste requis (bug upstream persistant) ; le plugin ONNX et le build from source restent actifs.

**Prochain chantier : choix des modèles puis du runtime, avant d'écrire l'ASR** — la plateforme est saine, mais les modèles choisis il y a 6 mois sont à rouvrir (Parakeet-TDT v3 vs Whisper Medium, SwiftF0 vs CREPE, PII FR prêts à l'emploi : §10) et ExecuTorch est candidat face à ONNX Runtime (§9) ; le code ONNX existant est quasi vide (`Runtime.ts` + squelettes), donc le coût de changer est minimal aujourd'hui. Étude de maintenabilité en §8 (ORM maison **conservé**, Lucide/Storybook/ESLint conservés). Suivis post-migration non urgents en §7.

---

## 1. Position actuelle de la plateforme

| Brique | Installé (post-migration 26/10/2026) | Dernier stable | Écart |
|---|---|---|---|
| Expo SDK | **58.0.19** | 58.0.19 (15/10/2026) | ✅ à jour |
| React Native | **0.88.0** | 0.88.0 | ✅ |
| React / react-dom | **19.3.0** | 19.3.1 | patch |
| Moteur JS | Hermes **V1 par défaut** (`useHermesV1` retiré) | idem | ✅ |
| New Architecture | activée (`newArchEnabled=true`) | idem | ✅ |
| Node (engines) | `>=22.13.0` (CI sur Node **24**) | Expo 58 exige `^22.13 \|\| ^24.3 \|\| >=26` | ✅ |
| iOS deployment target | **16.4** (app + podspec `secure-recorder`) | SDK 56+ exige 16.4 | ✅ |
| Android | compileSdk **37** / target 36, Kotlin 2.0.21, minSdk 29 | SDK 58 compatible AGP 9 | ✅ (re-généré par prebuild) |

Environnement local : Node 24.12 ✅, pnpm 11.1.2, Xcode requis ≥ 26.4 dès SDK 56.

---

## 2. Inventaire des contournements « on the edge »

C'est le cœur du sujet. Chaque entrée = un contournement actif, son motif, sa fragilité, et ce que la migration change.

### 2.1 Patch pnpm `@react-native/babel-preset@0.85.3` — fragilité **haute**

`patches/@react-native__babel-preset@0.85.3.patch` ajoute `&& !isHermes` pour empêcher `plugin-transform-classes` de tourner sous Hermes.

- **Motif** : l'ORM maison (`@Entity/@Column`) utilise les decorators **2023-05**, dont le transform émet des blocs statiques `_initClass` que `plugin-transform-classes` détruit. Sous Hermes V1 (qui supporte les classes nativement), il faut laisser les classes telles quelles.
- **Statut post-migration** : patch **régénéré pour 0.85.3** (l'ancien 0.83.6 supprimé) — le bug upstream **persiste** dans cette version, embarquée par RN 0.86 comme par RN 0.88 → le patch reste **requis**.
- **Fragilité** : patch épinglé à `0.85.3` exactement. **Chaque bump RN le casse** → à régénérer à chaque étape (`pnpm patch`). Éviter de supprimer `pnpm-lock.yaml` : la version tirée ne serait plus 0.85.3.
- **Complément `babel.config.js`** (voir §0, point 2) : `unstable_transformProfile: 'hermes-stable'` (détection Hermes côté preset) + `@babel/plugin-transform-typescript` en premier plugin (`isTSX: true, allExtensions: true`) pour stripper le TS avant les decorators. Le patch reste la ceinture après ces bretelles.

### 2.2 Hermes V1 forcé (`useHermesV1: true`) — ✅ RÉSOLU par la migration

- En SDK 55/RN 0.83, Hermes V1 était un **opt-in anticipé** ; il est le défaut depuis RN 0.85/SDK 56.
- **Historique de bugs connu** sur cette combinaison : régression mémoire Hermes V1 × `react-native-worklets`/`react-native-reanimated` (expo/expo#46519) et startup dév lent (#48298), corrigées dans RN 0.86.2 / 0.86.3 (expo ≥ 57.0.9 / 57.0.17).
- **Résolu le 26/10/2026** : le flag `useHermesV1` a été retiré d'`app.json` (propriété de toute façon supprimée du schéma SDK 58). Projet sur RN 0.88.0 / worklets 0.13.0 / reanimated 4.7.1, Hermes V1 natif.

### 2.3 Plugin `plugins/withOnnxruntime` — fragilité **haute** (état vérifié par diff contre le tarball npm pristine 1.24.3)

**Statut post-migration** : tous les hacks restent actifs et nécessaires — le hack fbjni (`build.gradle`) est même devenu **obligatoire** (Gradle 9 ne résout plus `VersionNumber`). ⚠️ Rappel opérationnel : relancer `pnpx expo prebuild` après chaque `pnpm install` (les mutations `node_modules` sont perdues, voir bas de section).

Vérification faite (26/10/2026) : `npm pack onnxruntime-react-native@1.24.3` puis diff des 3 fichiers ciblés par le plugin.

| Hack | Statut vérifié |
|---|---|
| **Podspec header fix** (iOS) | **Toujours requis.** Le tarball pristine ne déclare que `-DORT_ENABLE_EXTENSIONS=1` **sans** les `HEADER_SEARCH_PATHS` pour `onnxruntime-extensions-c` — le build iOS échouerait sans le patch. La copie `node_modules` est bien mutée (ligne présente, confirmée par diff). |
| **`binding.ts` TurboModule fallback** | **Toujours requis.** Pristine = `export const Module = NativeModules.Onnxruntime` direct ; local = fallback `TurboModuleRegistry.get('Onnxruntime')`. C'est exactement ce que l'exception `OnnxRuntimeError` documente comme cas d'échec. |
| **`binding.js` patch** | **No-op — à nettoyer.** Le fichier `lib/binding.js` n'existe plus dans le paquet 1.24.3 (il ne reste que `lib/binding.ts`, `main` pointe vers `dist/`). La regex du plugin ne matche plus rien, silencieusement. |
| **`build.gradle` fbjni removal** | **Obligatoire depuis SDK 58.** Le bloc pristine (`if (VersionNumber.parse(REACT_NATIVE_VERSION) < "0.71")` + `extractLibs "com.facebook.fbjni:fbjni:+"`) était du code mort sous RN ≥ 0.71, mais **Gradle 9.4 (SDK 58) ne résout plus la propriété `VersionNumber`** dans ce scope → erreur d'évaluation bloquante du projet Android. Le plugin doit tourner à chaque prebuild. |
| settings.gradle (`providers.exec`) + `MainApplication` | Contournements pnpm, toujours actifs. |

**Nouveaux risques découverts au passage :**

- **Versions flottantes côté Android** : `com.microsoft.onnxruntime:onnxruntime-android:latest.integration@aar`, `onnxruntime-android-qnn:latest.integration`, `onnxruntime-extensions-android:latest.integration` — **3 dépendances Gradle non épinglées** → builds Android non reproductibles, toute publication Maven de Microsoft peut casser le build du jour au lendemain. À épingler via `resolutionStrategy` ou lock.
- **Écarts de versions natif/binding** : pod iOS `onnxruntime-c` résolu **1.26.0** (non épinglé dans le podspec, figé par `Podfile.lock`) pour un binding npm **1.24.3** ; `onnxruntime-extensions-c` 0.13.0.
- **Le paquet RN est en retard sur le train ORT** : dernière publication npm RN = **1.24.3 (05/03/2026, 7 mois)**, alors que le train ONNX Runtime est passé 1.29 (juil.) → 1.30 (sept.) → 1.32 en préparation (oct., vu sur le dépôt GitHub). L'activité `js/react_native` sur `main` continue (ex. EPContext data callbacks, #32308) mais **aucun correctif upstream n'est visible pour nos 3 hacks** — ils resteront nécessaires après migration.

**Procédure de re-validation à chaque bump d'ORT ou de RN** (à ajouter au plan de migration) :

```bash
mkdir -p .tmp-ort-check && cd .tmp-ort-check
npm pack onnxruntime-react-native@<version> --pack-destination .
tar -xzf onnxruntime-react-native-<version>.tgz
# diff les 3 fichiers contre node_modules/onnxruntime-react-native/ :
#   onnxruntime-react-native.podspec · lib/binding.ts · android/build.gradle
```

Puis re-tester réellement : prebuild + inférence CAM++.

⚠️ **Règle opérationnelle** : les mutations de `node_modules` (podspec, `binding.ts`, `build.gradle`) sont perdues à **chaque** `pnpm install` qui relinke ORT. Après toute réinstallation : relancer `pnpx expo prebuild` **avant** de builder (`pnpm android:dev` / `ios:dev` ne re-prebuildent pas). Symptôme si oublié : `Could not get unknown property 'VersionNumber'` (Android) ou échec `SessionUtils.cpp` (iOS).

### 2.4 `buildReactNativeFromSource: true` + `useFrameworks: 'static'` (iOS) — coût **élevé, gain potentiel majeur**

- Compile tout React Native depuis les sources au lieu des binaires prébuilds.
- **Ce que SDK 56/58 apportent** : XCFrameworks iOS précompilés (−1 min médiane), `expo-modules-core` Android précompilé (build Android ÷2 mesuré par Expo), headers précompilés expérimentaux (`android.usePrecompiledHeaders`, CMake ÷2,8 sur leurs benches).
- **Suivi restant** : tester la suppression des deux flags (probablement liés aux extensions ONNX). Si les prébuilts SDK 58 suffisent, c'est le plus gros gain de temps de build disponible (builds ÷2).

### 2.5 `withGradleLimits` (`workers.max=2`, daemon idle 10 s) — mitigations machine, pas des bugs

Limitation de RAM pour la compilation C++ parallèle. Complète le point 2.4 : si les prebuilts SDK 58 suffisent, ces limites deviennent probablement inutiles.

### 2.6 Metro custom — fragile mais standard

`unstable_enablePackageExports` (pnpm) + `assetExts += onnx/ort` — `unstable_enableSymlinks` **retiré pendant la migration** (intégré à `@expo/metro-config` depuis SDK 56). Préfixes `unstable_` = API mouvante ; à re-vérifier à chaque SDK (les options stables peuvent les remplacer).

### 2.7 Divers natif

- `packagingOptions.pickFirst` (`libc++_shared.so`, `libfbjni.so`, `libonnxruntime.so`) : classique avec ORT, à conserver.
- `expo prebuild` **vide et régénère `ios/`+`android/` par défaut depuis SDK 57** : les dossiers natifs commités seront re-générés — s'assurer qu'aucun mod manuel non tracé n'existe (le Podfile inspecté est standard généré).
- `expo-main/` vide : résidu à supprimer.

---

## 3. Drift des dépendances JS (npm au 26/10/2026)

### Critiques — ✅ toutes traitées pendant la migration (26/10/2026)

| Paquet | Avant → Après | Note |
|---|---|---|
| `expo-router` | 55.0.14 → **58.0.26** | SDK 56 : fork de react-navigation — `@react-navigation/*` purgé, `src/Navigation/` supprimé |
| `react-native-worklets` | 0.7.4 → **0.13.0** | peer RN `0.86–0.88` |
| `react-native-reanimated` | 4.2.3 → **4.7.1** | suit worklets |
| `react-native-screens` | 4.23.0 → **4.30.0** | |
| `react-native-gesture-handler` | 2.30.1 → **3.3.0** | major |
| `kysely-expo` | 5.0.0 → **56.0.0** | versionné sur le SDK |
| `jest-expo` | 55.0.17 → **58.0.12** | Jest **30.5.2** en place |
| `babel-preset-expo` | 55.0.21 → **58.0.20** | patch pnpm `@react-native/babel-preset` régénéré (0.85.3) |

### Indépendantes du SDK (bump séparés, faible risque)

| Paquet | Installé | Latest | Note |
|---|---|---|---|
| `react-native-quick-crypto` | 1.1.2 | 1.1.8 | patch drift ; transitifs `react-native-nitro-modules` 0.35.6 / `quick-base64` 2.2.2 |
| `kysely` | 0.28.14 | 0.29.7 | mineur |
| `zod` | 4.3.6 | 4.6.7 | mineur |
| `@tanstack/react-query` | 5.90.21 | 5.105.0 | mineur |
| `react-hook-form` | 7.71.2 | 7.91.0 | mineur |
| `lucide-react-native` | 0.575.0 | **1.61.0** | **major** — vérifier breaking icons |
| `uuid` | 13.0.0 | 14.0.3 | major ; occasion de re-tester si `react-native-get-random-values` reste nécessaire |
| `mathjs` | 15.1.1 | 15.2.0 | mineur |
| `dayjs` | 1.11.19 | 1.11.23 | mineur |
| `typescript` | **6.0.3** ✅ (fait en migration) | **7.0.2** | TS 7 = 2e étape, après stabilisation |
| `@biomejs/biome` | 2.4.4 | 2.6.3 | mineur |
| `@testing-library/react-native` | 13.3.3 | **14.1.0** | major — à caler avec le passage Jest 30 |
| `storybook` / `@storybook/react-native` | 10.2.x | 10.7.0 | mineur |

### À jour / sain (avec nuances)

- `onnxruntime-react-native` **1.24.3 = dernière version publiée sur npm** ✅ — MAIS la publication est rare : 7 mois sans release alors que le train ORT natif est à 1.30/1.32 (cf. §2.3). Ne pas confondre « npm à jour » et « projet ORT à jour ».
- `@legendapp/state` 2.1.15 = dernière ✅
- `react-native-paper` 5.15.0 → 5.15.3 (patch)
- `typesafe-i18n` 5.27.1 = dernière… **depuis longtemps** (projet stagnant en amont) — risque maintenance à garder à l'œil, pas d'action immédiate.
- `@react-native-vector-icons/material-design-icons` **14.0.0** = dernière ✅ — ajouté en migration (§0, point 12) : glyphes internes de `react-native-paper` depuis que `@expo/vector-icons` (déprécié) a été retiré des deps d'`expo` en SDK 56.

---

## 4. Chemin de migration 55 → 58 — ✅ EXÉCUTÉ (26/10/2026)

Le chemin A (SDK 56) → B (SDK 57) → C (SDK 58) a été suivi sans saut, absorbant tous les breaks identifiés : purge `@react-navigation`, `expo-file-system` async, Hermes V1 par défaut, Strict TypeScript API, Node 24, worklets/reanimated, patch babel-preset 0.85.3. Détail des changements : §0.

Ce qui reste ponctuellement à vérifier (non couvert par la validation du 26/10) :

- **R8/minify en release Android** (activé par défaut en SDK 58) : les libs à réflexion (nitro, ORT, quick-crypto) peuvent nécessiter des règles ProGuard → un build release reste à tester.
- **SceneDelegate.swift iOS** (généré par prebuild SDK 58, cycle de vie de scène) : à vérifier au premier build iOS post-migration (`pnpm ios:dev`, restant — §7).
- **Strict TypeScript API (RN 0.87)** : audit fait — aucun deep import `react-native/Libraries/*` dans `src/` ni `app/` ✅ (l'opt-out `customConditions` ne sera pas nécessaire).

---

## 5. Risques propres au projet, par ordre de dangerosité (statut post-migration)

1. **Decorators 2023-05 × Hermes × RN 0.88** — toujours actif : le bug upstream (`plugin-transform-classes` vs `_initClass`) persiste en babel-preset 0.85.3 → patch requis, à régénérer à chaque bump RN. Boot + ORM décoré validés sur émulateur Android le 26/10.
2. **Plugin ONNX** — inchangé (§2.3) : hack podspec + fallback `binding.ts` requis en 1.24.3, hack fbjni désormais **obligatoire** (Gradle 9). ⚠️ Relancer `pnpx expo prebuild` après chaque `pnpm install`, puis re-tester une inférence CAM++ réelle. Restants : épingler les 3 AAR Gradle `latest.integration` (builds non reproductibles), nettoyer le patch `binding.js` no-op.
3. **`useFrameworks: 'static'` iOS** — toujours en place ; tester l'assouplissement vers les prebuilts (gain de build massif, builds ÷2) au prochain passage iOS (§7).
4. **R8 en release (SDK 58)** — toujours non testé : vérifier quick-crypto/nitro/ORT sur un build release.
5. **Santé type-check (134 erreurs préexistantes, voir STATE.md)** — pas bloquant (majorité dans `tests/` driftés + 12 dans `src/`) ; le ménage des imports cassés reste à faire avant de cumuler avec d'autres chantiers.

---

## 6. Recommandations (rapides)

- ~~CI Node 20 → 24 + `engines.node >=22.13`~~ ✅ fait en migration (les deux workflows sur Node 24).
- ~~`@types/node` 25~~ ✅ en place (^25.3.0).
- **Supprimer `expo-main/`** (dossier vide, toujours présent).
- Doublon Biome/ESLint (deux linters configurés, `eslint.config.mjs` + plugins) : toujours à trancher — un seul à terme.
- `uuid` 14 + question `react-native-get-random-values` : à re-vérifier au bump (peut-être supprimable).
- EAS non configuré (`projectId: null`) — sans objet tant qu'on build en local, à trancher avant toute distribution.

---

## 7. Prochaines étapes

1. **Commit du working tree de migration** (~40 fichiers JS/TS + natif régénéré + `pnpm-lock.yaml`) — l'utilisateur exécute, l'agent ne commit jamais.
2. **Build natif iOS complet** (`pnpm ios:dev`) : dernière validation plateforme restante (Android fait, §0) — inclut la vérification SceneDelegate (§4) et l'inférence CAM++ réelle.
3. **Chantier prioritaire : spike modèles + runtime** (§9.3 / §10.4) — tester **Parakeet-TDT 0.6B v3** sur iOS **et** Android (timestamps mot, WER/RTF sur audio FR représentatif) sous ExecuTorch et/ou ORT, vérifier le build `react-native-executorch` sur RN 0.88/SDK 58 (iOS 17, `allowBuilds`, télémétrie off) ; puis seulement implémenter l'ASR. Ne pas supprimer le plugin ONNX avant verdict. Cf. `docs/app_design_architecture.md` (modèles §6/§9 à mettre à jour après décision).
4. **Suivis non urgents** :
   - Tester la suppression `buildReactNativeFromSource` / `useFrameworks: 'static'` (gain builds ÷2).
   - Épingler les AAR ONNX `latest.integration` ; nettoyer le patch `binding.js` no-op du plugin `withOnnxruntime`.
   - ~~Recâbler le trigger 5-taps~~ — déjà en place dans `src/Screen/SettingsScreen.tsx` (pousse `/dev-seed`, écran dev routé le 26/10).
   - Test release Android (R8) ; chantier 16 KB page size **avant toute distribution Play**.
   - Bumps indépendants : quick-crypto, zod, react-query, react-hook-form, lucide 1.x (major), uuid 14 (major), testing-library 14 (major), paper 5.15.3 ; TS 7 en dernier.

Ordre des chantiers vs `STATE.md` : **la migration plateforme est terminée ; l'ASR démarre après le spike modèles/runtime (§9-§10).**

---

## 8. Plan de réduction de la codebase (étude du 26/10/2026)

> Étude statique (lecture du code, greps d'usage, `git ls-files`). **Les chiffres de lignes sont mesurés ; les gains (kB, minutes) sont des estimations à confirmer.** Rien n'a été modifié dans le code : ce chapitre est une feuille de route.
>
> ⚠️ **Révision du 26/10 après retour du mainteneur** : l'objectif n'est **pas** de réduire le code mais d'améliorer la **maintenabilité** (moderniser ce qui est obsolète, retirer ce qui est réellement inutile). Les items ci-dessous marqués **[RÉVISÉ]** remplacent la version initiale ; la mention « −N lignes » n'est plus un critère de décision. Rien n'est supprimé sans validation explicite (code « dormant » = peut-être prévu pour l'ASR/pipeline double flux).

**Photographie** (hors `generated/`) : `src/` ≈ 15 k lignes TS (221 fichiers suivis) · `tests/` ≈ 10 k · module natif `secure-recorder` ≈ 15 k (127 fichiers, dont ~9 k de tests Swift/Kotlin/TS) · 18 + 37 fichiers `ios/` `android/` suivis · 2 plugins + 2 patchs. Le fil rouge : **la plupart des « contournements » du §2 sont la conséquence de 3-4 choix de début de projet** (ORM maison à decorators, plugin ONNX qui mute `node_modules`, natif commité, builds depuis les sources). Les supprimer à la racine vaut mieux que de les maintenir.

### 8.1 Gros leviers (structurants)

#### L1 [RÉVISÉ] — ORM maison : le **conserver**, isoler sa fragilité
Après lecture de `AbstractEntity`, `Column`, `QueryCompiler` : ce n'est pas un ORM générique redondant, c'est un **magasin de documents sur SQLite** (« Class-Is-Schema » : colonne `data` JSON + colonnes virtuelles indexées + colonnes FTS5 sur un chemin JSON, ex. `$.text` des segments de transcription, DDL généré depuis les decorators). Kysely seul, Drizzle ou autres n'offrent pas ce modèle ; les remplacer = réécrire ces fonctionnalités à la main. **Je retire la recommandation de suppression.**
Ce qui reste utile : la fragilité n'est pas l'ORM, c'est le **couplage decorators 2023-05 ↔ Babel/Hermes** (patch pnpm d'une ligne + 4 plugins). Pistes de maintenabilité, par ordre de coût :
1. **Test-sentinelle** : un test Jest/CI qui échoue explicitement si le patch `@react-native/babel-preset` n'est plus appliqué ou plus nécessaire (transformer une entité décorée et vérifier `_initClass`) → plus de surprise à chaque bump RN.
2. Suivre l'issue upstream (`plugin-transform-classes` × decorators) et retirer le patch dès qu'elle est corrigée ; vérifier à chaque SDK si Hermes V1 + `babel-preset-expo` gèrent les decorators sans surcharge.
3. Nettoyages locaux sans changer le modèle : getters/setters passe-plats des entités (`Patient.getBiocode()`…) et `Column.initializer` qui **duplique** `AbstractEntity.ensureColumnAccessors` (accessors posés deux fois : instance + prototype) — à unifier pour qu'un seul mécanisme porte la sémantique « les champs undefined n'écrasent pas ».
4. (Option, si un jour la fragilité devient trop coûteuse) déclaration de schéma **sans decorators** (`static columns = {…}`) en gardant `EntityMetadata`/DDL/`QueryCompiler` intacts.

<details><summary>Ancienne proposition (retirée) : remplacer l'ORM par Kysely direct</summary>

- **Périmètre** : `src/Database/` (≈ 2 400 l, 28 fichiers) + `src/Decorator/` (≈ 700 l) + ~3 000 l de tests associés (`tests/Database`, `tests/Decorator`). Il génère le DDL (`DefinitionBuilder`/`DefinitionLanguageWriter`), un `QueryCompiler`, un `Criteria`, un registre, des transformers — alors que **Kysely** (déjà là, imposé par CLAUDE.md) fournit builder + `Migrator` + typage.
- **Ce que ça fait sauter** (voir §2.1, §5 risque n°1) : le patch pnpm `@react-native/babel-preset`, `@babel/plugin-proposal-decorators`, `plugin-transform-class-properties` loose, `plugin-transform-class-static-block`, le `plugin-transform-typescript` en premier plugin + `isTSX`, `unstable_transformProfile`, `reflect-metadata`, et la quasi-totalité de `babel.config.js` (→ `babel-preset-expo` seul + module-resolver). **Fin de « régénérer le patch à chaque bump RN ».**
- **Cible** : types de lignes (`interface PatientRow`) + `DatabaseSchema` Kysely + migrations en code (`Migrator` avec un `MigrationProvider` en objet — ce qui rend aussi le patch `kysely@0.28.17` sans objet si on évite l'import du `FileMigrationProvider`, à vérifier) + une classe `Repository` par agrégat (5 existent déjà : ~300 l). Les entités deviennent des classes/records simples : `Patient.ts` fait ~100 l pour 5 champs à cause des getters/setters passe-plats (`getBiocode()` etc.).
- **Gain** : ≈ −3 000 l src, −3 000 l tests, −7 deps/plugins Babel, −1 patch, −1 risque n°1. **Coût** : moyen (refonte de la couche persistance, 9 entités, 5 repos) — à faire **avant** de brancher Transcription/ASR, quand il y a peu de données. **Alternative** : Drizzle (support expo-sqlite officiel, migrations générées) supprimerait aussi Kysely + `kysely-expo` + patch kysely, mais contredit la règle CLAUDE.md « Kysely » → à arbitrer par vous.
- **Point d'attention** : la table suit un modèle « hybride uuid + colonne JSON `data` » ; décider si on garde ce stockage (simple, schéma souple) ou si on passe à de vraies colonnes (requêtes/index).
</details>

#### L2 — Industrialiser ONNX : de « plugin qui mute node_modules » à `pnpm patch`
> **[RÉVISÉ] Cadrage runtime** (relu `docs/app_design_architecture.md`) : le projet n'est pas « du STT » mais un pipeline **multi-modèles sur un seul runtime** : Silero VAD → diarisation/CAM++ (biocode) → Whisper par segment (timestamps mot) → CREPE (VoiceFrame pitch/énergie/périodicité) → NER d'anonymisation (BERT) → synchro acoustique, avec optimisations graphe/NPU prévues. **ONNX Runtime reste le bon dénominateur commun** ; introduire une 2ᵉ stack (ExecuTorch, whisper.rn) pour le seul ASR doublerait runtimes, binaires, mémoire et chaînes de build sans couvrir CAM++/CREPE/NER. La douleur est le **packaging** d'`onnxruntime-react-native` (publication rare, 3 hacks), pas le choix ONNX → d'où la reco ci-dessous (reprendre la main sur le packaging) et, à évaluer, **sherpa-onnx** (cité dans CLAUDE.md : VAD + ASR + embeddings locuteur + diarisation sur ORT) — *existence/état d'un binding RN non vérifié*.
> **Conséquence DSP** : Whisper (log-mel 80/128), CAM++ (fbank 80) et CREPE (trames brutes 16 kHz) partagent un **front-end audio commun** → fort argument pour le mettre une fois en natif dans `secure-recorder` (cf. C2) plutôt qu'en JS/mathjs.

- Remplacer les 3 mutations de `plugins/withOnnxruntime.js` (podspec, `binding.ts`, `build.gradle`) par **`pnpm patch onnxruntime-react-native@1.24.3`** (le dossier `patches/` existe déjà). Un patch pnpm survit à `pnpm install` → **disparition de la règle « relancer `expo prebuild` après chaque install »** (§2.3).
- Au passage : supprimer le hack `binding.js` (no-op confirmé), **épingler les 3 AAR `latest.integration`** dans le patch du `build.gradle`, et ne laisser dans le plugin que les modifications de projets générés (`MainApplication`, `settings.gradle`) — ~210 l de plugins → ~60.
- **Question à trancher avant l'ASR** : a-t-on réellement besoin de `onnxruntime-extensions` (flag `onnxruntimeExtensionsEnabled`, header-hack iOS, AAR extensions) ? Si le tokenizer Whisper est fait en JS/natif et le prétraitement audio en dehors d'ORT, on supprime l'extension, son hack podspec et un AAR. Vérifier aussi si l'AAR **QNN** est réellement utile (poids APK) ; sinon variante CPU seule. À valider sur un build.

#### L3 [RÉVISÉ — NON VÉRIFIÉ, ne pas appliquer en l'état] — CNG : `ios/` et `android/` hors git ?
- Cette reco reposait uniquement sur la phrase du §2.7 (« prebuild régénère par défaut depuis SDK 57 ») ; **je n'ai pas diffé les dossiers natifs commités contre un prebuild propre**, donc je ne sais pas s'ils contiennent des modifications manuelles ni si `Podfile.lock` doit rester pour la reproductibilité. À vérifier (prebuild dans un dossier temporaire + `diff -r`) avant toute décision. Garder `ios/`/`android/` committés est un choix valide.
- (Texte initial) Depuis SDK 57 `prebuild` régénère tout (§2.7) ; 55 fichiers natifs suivis (Podfile.lock, gradle, pbxproj…) sont donc du bruit de diff et une source de conflits. Les plugins (`app.json`) deviennent la **seule** source de vérité → `ios/` et `android/` en `.gitignore` (garder `Podfile.lock` seulement si on veut des builds reproductibles côté iOS — à décider).
- Prérequis : L2 (sinon un fresh checkout ne build pas sans prebuild + hacks).

#### L4 — Builds natifs ÷2 : lever `buildReactNativeFromSource` + `useFrameworks: 'static'` + `withGradleLimits`
- Déjà identifié (§2.4/§2.5), mais c'est le plus gros gain **de temps** : tester les prebuilts SDK 58. Supprimer `plugins/withGradleLimits.js` s'ils suffisent. Dépend de la réponse à L2 (extensions ORT) pour `useFrameworks`. **Risque** : pods ORT incompatibles avec les frameworks dynamiques → test iOS requis (déjà dans §7).

### 8.2 Code maison remplaçable par une lib / la plateforme

| # | Cible | Constat (mesuré) | Proposition | Gain estimé |
|---|---|---|---|---|
| C1 | **`mathjs`** (4 fichiers : `VectorProjection`, `ProjectionMatrixFactory`, `AudioFeatureExtractor`, `Biocode`) | n'utilise que `dot`, `sqrt`, `multiply`, `reshape` et **`fft`** ; `Biocode.similarityTo` **duplique** `VectorProjection.cosineSimilarity` | Écrire `dot/cosine/matVec` sur `Float32Array` (≈ 30 l) ; FFT : voir C2. Dédupliquer cosine. | −1 grosse dep (mathjs ≈ plusieurs centaines de kB de JS dans le bundle Hermes, Metro ne tree-shake pas), calcul sans allocation d'objets `Complex` |
| C2 | **Extraction log-mel en JS** (`AudioFeatureExtractor`, FFT mathjs sur `number[]` + `Complex`, filtre mel en O(bins×frames) JS) | Correct pour 30 s de CAM++, **inacceptable pour Whisper** (30 s × fenêtres de 10 ms, 4 h d'audio) | Décider **maintenant** pour l'ASR : (a) fbank natif Swift (vDSP)/Kotlin dans `secure-recorder` (audio déjà déchiffré en RAM → pas d'aller-retour JS) ; (b) graphe ONNX de prétraitement (ORT-extensions, cf. L2) ; (c) a minima `fft.js`/radix-2 sur `Float32Array`. Reco : (a) ou (b) | perf ×10-50 (estimation), évite d'écrire deux fois |
| C3 | **`uuid` + `react-native-get-random-values` + `expo-crypto`** (8 fichiers entités) | 3 deps pour de l'aléa/UUID alors que `react-native-quick-crypto` (déjà là, requis pour le hash en flux) expose `randomUUID`/`randomBytes` | Tout sur quick-crypto (ou `crypto.randomUUID` si exposé par le runtime — à vérifier sur Hermes/RN 0.88) | −3 deps, −1 polyfill global dans `app/_layout.tsx` ; résout la question « `get-random-values` supprimable ? » du §6 |
| C4 | **`dayjs` (+ plugin utc)** | Entités stockent des **ISO strings via Dayjs** + `DateTransformer`, alors que CLAUDE.md impose « **entiers en millisecondes** » partout | `number` (epoch ms) en base et dans les entités ; formatage via `Intl.DateTimeFormat`/`toLocaleString` à l'affichage. S'intègre à L1 (plus de transformer) | −1 dep, −`DateTransformer`, conformité à la règle |
| C5 | **`lodash`** (7 fichiers : `isEmpty`, `isFunction`, `isObject`, `isString`, `trim`, `snakeCase` ×3) | Imports par chemin (pas de bundle massif) mais trivialement natifs | Natif / une méthode statique `snakeCase` — et **disparaît presque de lui-même avec L1** (6 des 7 fichiers sont dans `Database/`/`Decorator/`) | −1 dep |
| C6 | **`semver`** (1 usage : `HardwareGuard`) | comparaison de version OS | `parseInt(Platform.Version)` / comparaison majeure | −1 dep |
| C7 | **`check-password-strength`** (1 écran) + **`zod`/`react-hook-form`/`@hookform/resolvers`** + **observables Legend** | Deux paradigmes d'état de formulaire (RHF dans `Components/Form/*` **et** `State/Onboarding/*` + `FormValidator`) | Trancher : un seul modèle de formulaire (reco : Legend + validation zod déjà écrite dans `State/Onboarding/Schema.ts`, ou RHF seul) | −2 à −3 deps, −`FormValidator`/adaptateurs |
| C8 | **`lucide-react-native` vs icônes Paper** | Deux jeux d'icônes (Paper embarque déjà MaterialDesignIcons, ajouté en §0.12) ; Lucide est un **major en retard** (0.575 → 1.61, §3) | Basculer sur `Icon` de Paper → plus de bump major, −1 dep. ⚠️ CLAUDE.md impose Lucide : à arbitrer | −1 dep, −1 chantier de bump |
| C9 | **`typesafe-i18n`** (stagnant en amont, §3) | 2 langues × 127 l + **448 l de types générés** + `Localization.ts` 152 l | Dictionnaire `fr` typé par `typeof en` (`satisfies`) + petite classe `Localization` ; plus de générateur ni de `.typesafe-i18n.json` | −1 dep (+ risque maintenance), −450 l générées |
| C10 [RÉVISÉ : à ne pas simplifier] | **Moteur de téléchargement de modèles** — il servira aussi aux **mises à jour de l'app/modèles** : la file persistée, les exécuteurs et la reprise se justifient. Action = *moderniser/auditer* (API `expo-file-system` async SDK 58, reprise Range, tests) et non réduire. Description initiale :**Moteur de téléchargement de modèles** : `InferenceModel/Download/*` ≈ 1 400 l (Manager 513, Executor 285, Storage 236, ExecutorCollection 197, FileDownloader 142, Checksum, Downloader, Setup, Config) + 600+410 l de tests | File de tâches générique persistée en SQLite, concurrence=1 par défaut, pour télécharger **quelques fichiers** | Un `ModelDownloader` unique : `expo-file-system` (`File.downloadFileAsync`/Range pour reprise) + `ChecksumVerifier` existant + un champ statut sur le modèle ; supprimer `ExecutorCollection`/`DownloadQueue` générique. ⚠️ Garder la reprise après kill et la contrainte Wi-Fi (`WifiVerifier`). Évaluer aussi **embarquer Silero VAD / CAM++ (petits) en assets** et ne télécharger que Whisper | ≈ −1 000 l src, −800 l tests ; **à confirmer** : tailles réelles des modèles et besoin de téléchargement en arrière-plan iOS (URLSession background) avant de simplifier |

### 8.3 Code mort, doublons et hygiène du dépôt (gain immédiat, risque quasi nul)

- **Dépendances sans aucun import dans `src/`/`app/`** (grep) : `slugify`, `@react-native-async-storage/async-storage`, `@react-native-community/slider`, `@react-native-community/datetimepicker` (+ son plugin dans `app.json`), `reflect-metadata`, `react-dom` (à confirmer vs expo-router natif), devDeps `@faker-js/faker`, `ts-node`, `js-yaml`, `esbuild` (+ `trustedDependencies`), `babel-plugin-inline-import`, `@babel/preset-env`, `@testing-library/jest-native` (déprécié, intégré à RNTL ≥ 12.4), `@types/react-test-renderer`. **`babel-jest ^29` est incohérent avec Jest 30** et `react-test-renderer 19.2.0` avec React 19.3.0. ⚠️ Vérifier chaque entrée (usage via config/script/peer) avant retrait — `pnpm why` + test suite.
- **Génération d'API** : `docs/api-generation.md` décrit encore OpenAPI-Generator (Java) alors que `generate-api.js` appelle `@hey-api/openapi-ts` via `bunx` (alors que le projet est pnpm) → retirer `@openapitools/openapi-generator-cli`, aligner script/doc. Mocks : `json-server`, `msw`, `db.json`, `scripts/mock-server.js`, `generate-mock-db.js`, `src/Api/mocks/*.json` : garder **un** mécanisme.
- **Casse `src/api` vs `src/Api`** : git suit `src/api/*` (minuscule, 11 fichiers) alors que le disque (macOS, insensible à la casse) montre `src/Api` → cassera sur CI Linux/checkout propre. À corriger (`git mv`).
- **Fichiers à ne pas suivre** : `repomix-output.xml` (1,2 Mo), **`tiro-scribe.sqlite` (base de données suivie dans git — risque données sensibles, à vérifier et purger de l'historique si besoin)**, `.DS_Store` sous `src/`, `scripts-tmp-babel-test.js`, `expo-main/` (déjà §6).
- **Code mort dans `src/`** : `Util/AsyncQueue.ts` (**0 utilisateur**), `Util/Timer.ts` et `Util/EventLoop.ts` (1 utilisateur chacun), `Core/AppRouter.ts` (try/catch autour d'un `router` qui ne jette pas — 6 usages à remplacer par `router`), `Components/AsyncButtonUtils.tsx`. Ces `Util/*` violent aussi la règle « NO Utils folders ».
- **Exceptions** : 23 fichiers, **16 classes référencées 0 ou 1 fois hors de `Exception/`** (`FileOperationError`, `InvalidAudioFormatError`, `NoActiveSubscriptionError`, `RecordingError`, `RecordingErrorType`, `RecordingUriUnavailableError`, `TranscriptionNotImplementedError` : 0). Les supprimer ou les regrouper en une base par domaine + code d'erreur (`Exception/` → ~8 fichiers).
- **Code de dev dans le bundle prod** [RÉVISÉ : on **conserve** `src/Dev/`, `app/dev-seed.tsx` et le 5-taps, outils de travail actifs] : seule piste, **ne pas les embarquer en release** (`if (__DEV__) require(...)` / route conditionnelle) — à décider avant distribution, pas un chantier de suppression.
- **Code « inutilisé »** (`AsyncQueue`, `Timer`, `EventLoop`, `AsyncButtonUtils`, exceptions à 0 référence) [RÉVISÉ] : liste donnée à titre d'**information** — certains éléments sont peut-être prévus pour le pipeline ASR/double flux. À valider un par un, rien n'est à supprimer d'office.
- **Tooling doublon** : Biome **et** ESLint. Biome ne sait pas trier les membres de classe (règle d'ordre alphabétique de CLAUDE.md, assurée par `eslint-plugin-perfectionist`). Option A : garder ESLint **uniquement** pour `perfectionist/sort-classes` (config 10 l) ; option B : abandonner la règle d'ordre alphabétique (gros bruit de diff) et supprimer ESLint + 4 deps.
- **Storybook** : 6 deps, `.rnstorybook/`, 10 stories pour 24 composants, branché dans `babel.config.js` (cache + `transform-inline-environment-variables`), `metro.config.js`, 8 scripts, et responsable de 3 des 4 échecs `expo-doctor` (§0). Si non utilisé activement → retirer ; sinon le déplacer dans un profil séparé.
- **Gestion de scripts** : `ios:dev`/`android:dev`/`*:fresh` répètent `STORYBOOK_ENABLED=false …` (disparaît avec Storybook) ; scripts `preios`/`clean:metro` redondants.

### 8.4 Module natif `secure-recorder` (127 fichiers)

- Le code de production tient en ≈ 4-5 k lignes ; **le reste est du test dupliqué** par la règle « chaque test iOS a son équivalent Android » (≈ 4 k Swift+Kotlin) **plus** ~2 400 l de tests TS qui mockent le module natif. Pistes, sans toucher au format AES-GCM ni à l'isomorphisme imposés :
  1. Réduire la couche TS (`SecureRecorder.ts` 422 l, `ErrorNormalizer.ts` 104 l + **466 l de test**, `PermissionManager.ts`, `DecryptionManager.ts`) : le natif Expo expose déjà des erreurs typées ; la normalisation et `PermissionManager` (qui lazy-importe `expo-audio` pour contourner un crash TurboModule) sont probablement réductibles.
  2. Supprimer le répertoire `build/` suivi/local et `verification.txt`/`scripts/verify-ios.sh` si obsolètes.
  3. **Y loger le prétraitement audio** (C2) et le déchiffrement-vers-RAM : une seule traversée JS↔natif, et JS n'a plus jamais d'audio en clair — **bénéfice sécurité** plus que taille.
- À ne **pas** « optimiser » : format de chunk, IV unique/chunk, clés Keychain/Keystore (règles CLAUDE.md).

### 8.5 Observations hors périmètre « taille » mais à traiter en passant

- `CryptoEngine` chiffre en **AES-256-CBC sans authentification** et dérive en **PBKDF2 1 000 itérations** : incohérent avec l'exigence AES-GCM du reste du projet. À corriger pendant le chantier (AES-GCM, itérations ≥ 600 000 pour un mot de passe, ou Argon2/scrypt si dispo). Ne pas confondre avec `generateDeterministicBytes` (PRF pour la matrice, pas un secret).
- `Container` : le code utilise `Container.get(Class)` + `Container.register(...)` en bas de fichier (service locator, ~44 occurrences), à l'opposé de la règle CLAUDE.md « `Container.camelCase`, passif, sans méthodes ». L1 + C10 retirent la majorité des enregistrements ; le reste mérite une décision (règle ou code ?).
- 134 erreurs `tsc` préexistantes (§5.5) : à traiter **après** L1/C10, car la majorité vient de `tests/` qui disparaissent avec eux.

### 8.6 Ordre recommandé [RÉVISÉ : la vague 2 « persistance » est abandonnée (ORM conservé) ; les vagues 1 et 3 dépendent du verdict runtime §9-§10 — L2/L4 et C1/C2 sont à re-chiffrer]

| Vague | Contenu | Effort | Risque |
|---|---|---|---|
| **0 – nettoyage** (½ j) | §8.3 : deps mortes, fichiers non suivis, casse `src/api`, `Util/*`, exceptions orphelines, retrait Storybook/doublon linter (selon décision) | faible | très faible |
| **1 – plateforme** (1-2 j) | L2 (`pnpm patch` ORT + épinglage AAR) → L3 (CNG) → L4 (builds sans from-source) | moyen | moyen (builds natifs) |
| **2 – persistance** (3-5 j) | L1 + C4 + C5 (+ C3 qui touche les mêmes entités) | élevé | moyen, filet = 599 tests à porter |
| **3 – ASR-ready** (2-3 j) | C1 + C2 (décision fbank), C10 (downloader), 8.4.3 | moyen | moyen |
| **4 – polish** | C6-C9, 8.5 (crypto), Dev hors bundle prod | faible | faible |

**Résultat visé (estimation)** : −8 à −10 k lignes (src + tests), −15 à −25 dépendances directes, **−2 patchs/plugins sur 4**, `babel.config.js` quasi vide, suppression du risque n°1 (§5) et de la règle « prebuild après chaque install ».

**Décisions (état après retour du mainteneur, 26/10)** : (1) ORM maison **conservé** (Drizzle écarté) ; (2) **Lucide conservé** (le bump major 0.575 → 1.61 reste à faire) ; (3) ESLint conservé pour l'ordre des membres : **ok** ; (4) **Storybook conservé** (sert à tester les composants isolément ; ses échecs `expo-doctor` restent cosmétiques) ; (5) `onnxruntime-extensions`/QNN : **inconnu** — déjà essayé par le passé, résultat non documenté → à re-tester par une expérience bornée (build sans extensions, vérifier tokenizer/prétraitement Whisper) plutôt qu'à trancher à la main ; (6) `ios/`+`android/` hors git : **non vérifié**, à diffé avant décision (cf. L3). Les tableaux de gains « lignes » et la section résultat visé ci-dessus ne sont plus des objectifs.

---

## 9. Validation ExecuTorch vs ONNX Runtime (recherche du 26/10/2026)

> Sources : `npm view` + tarball `react-native-executorch@0.10.7` inspecté (package.json, podspec, `src/`), docs officielles SWM, docs ExecuTorch 1.x, arXiv 2605.08195 (benchmark **publié par les mainteneurs d'ExecuTorch** → à recouper). Rien n'a été installé dans le projet ; aucun benchmark sur vos modèles/devices.

### 9.1 Faits vérifiés

| Sujet | Constat |
|---|---|
| Santé | `react-native-executorch` **0.10.7 (21/10/2026)**, nightlies quotidiennes (0.11 en préparation), MIT, 38 issues ouvertes. En face : `onnxruntime-react-native` **1.24.3 du 05/03/2026** (≈ 7,7 mois sans release npm, confirmé) |
| Compat. plateforme | RN ≥ 0.83 ou Expo ≥ 55, **New Arch obligatoire**, dev build (pas d'Expo Go). **iOS 17.0 minimum** (podspec) vs `deploymentTarget` actuel **16.4** → à relever (impact parc iOS). Android `minSdk` 26 par défaut (vous : 29 ✅) ; le README annonce « Android 13+ » (contradictoire, à tester) |
| Worklets | Les docs disent `<0.13` mais le `package.json` publié 0.10.7 déclare **`>=0.10.0 <0.14.0` → compatible avec votre worklets 0.13** (docs en retard). Table de compat. officielle : s'arrête à RN 0.86 / SDK 57 → **RN 0.88 / SDK 58 non listés** = non garantis |
| Installation | Binaires natifs (`ExecutorchLib`, backends XNNPACK/CoreML/MLX/Vulkan) **téléchargés en `postinstall` depuis les releases GitHub** → avec pnpm 11 il faut l'ajouter à `allowBuilds` ; builds dépendants du réseau/GitHub (CI, reproductibilité, supply-chain à encadrer). Peers : `react-native-blob-util`, optionnel `@kesha-antonov/react-native-background-downloader` |
| Modèles fournis | LLM, vision (classif., détection, OCR, segmentation…), embeddings texte, TTS, **Whisper tiny / base / small** (+ variantes EN), **VAD FSMN** intégré, tâche **`privacyFilter` (détection de PII)** |
| Modèles **absents** | **Whisper Medium** (cible de l'architecture) ; **timestamps** (le code décode avec `<\|notimestamps\|>`) ; **diarisation / embedding locuteur (CAM++)** ; **pitch (CREPE)** ; rien de tout ça dans `src/` |
| Modèle custom | Supporté : `loadModel(path.pte)` + `schema` (dtypes f32/u8/i32/i64, dims dynamiques), pipelines custom, `inspectModel`. Export = `torch.export` → `to_edge_transform_and_lower` (XNNPACK/CoreML/Vulkan). **Exemple trouvé : ECAPA-TDNN → `.pte`** (Qwen3-TTS) ; **Silero VAD cité par ExecuTorch 1.2** ; **CAM++, CREPE, BERT-NER : aucune preuve d'export** |
| « Model registry » | C'est `models` : un **catalogue statique d'URLs Hugging Face** épinglé par tag de version (`resolve/v0.10.0/...`). **Ne remplace pas** votre `ModelConfig`/ArtifactRegistry |
| Téléchargement | Fetcher intégré : URL distante quelconque ✅, **reprise** ✅ (`AbortSignal`, octets conservés), background download optionnel, `resourceFetcher` **injectable** (`initExecutorch`). Mais : clé de cache = `djb2(url)` ; **aucune vérification de checksum**, aucune notion de version/variante de langue/Wi-Fi/file persistée |
| Télémétrie | Analytics anonymes **activées par défaut** (`setTelemetryEnabled(false)` pour couper) ; ne se déclenche que pour les repos HF `software-mansion/*` — à désactiver explicitement vu la politique « rien ne sort » |
| Perf (benchmark éditeur) | CPU : comparable (ORT meilleur sur ResNet50). NPU : QNN nettement devant — mais **le NPU n'est pas dans votre périmètre** (« NPU : not started »). Aucun chiffre indépendant sur Whisper/CAM++/CREPE |
| Stabilité d'API | 0.x : entrée **`/legacy`** + nouvelle API (`models.*`, `./speech`, `./nlp`, `./schema`) ; breaking changes probables à chaque mineure |

### 9.2 Ce que ça change à la décision

- **La migration complète n'est pas livrable aujourd'hui** : il manquerait Whisper Medium + timestamps, CAM++, CREPE et probablement le NER → 4 exports PyTorch à réaliser/valider vous-mêmes. ExecuTorch n'élimine pas la « multiplication d'implémentations » tant que ces exports ne sont pas faits.
- **Ce qu'ExecuTorch apporte tout de suite** : un binding maintenu (fin des 3 hacks ORT + plugin), VAD, Whisper ≤ small, un `privacyFilter` PII (**à évaluer pour l'anonymisation** : langues, qualité fr/en inconnues), et un chemin custom propre.
- **Vos garde-fous restent à vous** : checksum, config serveur par langue, traçabilité `modelName/modelVersion`, file persistée Wi-Fi → on branche *votre* downloader via `resourceFetcher` plutôt que de le supprimer.
- **Coexistence ORT + ExecuTorch** = 2 runtimes embarqués (taille APK/IPA, RAM) → acceptable seulement comme **phase de transition** ou si un modèle reste ORT-only.

### 9.3 Spike recommandé (branche dédiée, 3 portes go/no-go)

1. **Faisabilité plateforme** (½ j) : ajouter `react-native-executorch@0.10.7` + `react-native-blob-util`, `allowBuilds`, iOS 17, `setTelemetryEnabled(false)` ; build Android + iOS sur RN 0.88 / SDK 58. *Échec = stop* (compat. non garantie).
2. **Modèle critique** (1-2 j) : export `.pte` de **CAM++** (et à défaut ECAPA) avec le front-end fbank figé (entrée de taille fixe, cf. exemple ECAPA) ; comparer **embeddings ORT vs ExecuTorch** (similarité cosinus ≈ 1 sur un jeu de voix) + latence/RAM sur 2 devices. *Biocode oblige : si la dérive d'embedding casse les biocodes existants → stop.*
3. **ASR** (1 j) : Whisper small via la lib sur un fichier réel déchiffré en RAM ; vérifier qualité fr, **absence de timestamps mot** et besoin de Medium. Décider : accepter small + alignement séparé, ou garder ORT pour l'ASR.
**Précision après relecture du code (retour mainteneur)** : seul `src/InferenceModel/Runtime.ts` importe `onnxruntime-react-native` ; `AutomaticSpeechRecognizer` et `SpeakerId` sont des squelettes (`TODO`, `return 'TODO: implement full transcription pipeline'`). Il n'y a donc **presque rien à migrer** : le coût d'un changement de runtime est faible *aujourd'hui* et ne fera que croître avec l'ASR. Conséquences : (1) la comparaison réelle est « ce qu'il faut écrire soi-même » — avec ORT : boucle de décodage Whisper, tokenizer, timestamps, mel ; avec ExecuTorch : déjà fournis jusqu'à small ; (2) la porte 2 n'a pas à protéger d'éventuels biocodes existants (pré-release, pas de rétro-compat requise) : seule compte la qualité des embeddings ; (3) ExecuTorch devient la **direction par défaut**, les portes servent de critères de sortie, pas de frein ; (4) garder `Runtime` comme seule interface vers le moteur pour rester remplaçable.
Livrable : tableau perf/qualité + décision (migration totale / hybride durable / rester ORT avec `pnpm patch`). Tant que la porte 2 n'est pas passée, **ne pas démarrer le chantier ASR sur ORT à l'aveugle ni supprimer le plugin ONNX**.

## 10. Revue des choix de modèles à fin 2026 (recherche du 26/10/2026)

> Les modèles de l'architecture (Silero v5, **Whisper Medium**, CAM++, **CREPE**, BERT-NER) ont été choisis il y a ~6 mois. Recherche web (papiers arXiv, billet PyTorch du 16/03/2026, cartes HF, README). **Aucun benchmark indépendant sur audio de séance thérapeutique** n'existe : tout chiffre ci-dessous est un ordre de grandeur éditeur/papier, à confirmer sur vos propres enregistrements (FR, parole spontanée, 2-3 locuteurs).

| Rôle | Choix actuel | Constat fin 2026 | Verdict |
|---|---|---|---|
| **ASR** | Whisper Medium (cible) / small (référencé) | **Parakeet-TDT-0.6B-v3** (NVIDIA) : 25 langues européennes dont FR, **timestamps mot/segment natifs**, ~5,0-5,2 % WER FR (FLEURS) vs ~6,3-7,2 % pour whisper-large-v3 ; Voxtral-Mini ≈ 4,6-5,8 % mais **~4 B params (5-6 Go en int4)** → hors mobile. Whisper large-v3-turbo = 809 M params (plus lourd que Parakeet, 99 langues). Moonshine : rien trouvé de comparable | **Remettre en cause Medium** : Parakeet v3 est mieux aligné sur vos besoins (FR, timestamps mot pour la synchro acoustique §9 Phase 3, taille ≈ 0,6 B). À confirmer sur vos audios |
| **Locuteur / biocode** | CAM++ (192-d) | Toujours pertinent : papier arXiv 2606.08505 mesure que CAM++ comme embedding coûte **< 0,01 DER absolu (AMI)** et accélère (RTF 0,074 → 0,061 sur M4) ; ECAPA2 meilleur en DER (−14 à −20 % relatif, oracle VAD) mais plus lourd | **Garder CAM++** (stable, biocode = embedding court) ; ECAPA2 seulement si la précision de l'identification l'exige |
| **Diarisation** | VAD + clustering maison (prévu) | **Sortformer** (NVIDIA, 117 M, ≤ **4 locuteurs**, DER 16,3 vs 18,3 pour pyannote sur BEA-Dialogue) — suffisant pour une séance 1-3 pers. ; **pyannote community-1** (CC-BY-4.0). Les chiffres « 1,5 Go de RAM pour pyannote » viennent d'un concurrent (Picovoice) → non fiables | À évaluer **après** choix ASR ; Sortformer = un modèle de plus à exporter (ExecuTorch : XNNPACK/CUDA, **pas de mobile annoncé**) |
| **Pitch (F0)** | CREPE | **SwiftF0** (arXiv 2508.18440, août 2025) : ~96 k params, **≈ 42× plus rapide que CREPE sur CPU**, ≈ +12 pts de score à 10 dB SNR (chiffres de l'auteur, non répliqués). FCPE/RMVPE : aucun comparatif commun trouvé. ⚠️ Pour jitter/shimmer, un F0 par trame de 10 ms est grossier — la dérivation est faite **côté serveur** (§7) ; à garder en tête | **Remettre CREPE en cause** (lourd pour 4 h d'audio sur mobile) ; tester SwiftF0 sur la même base que le serveur attend (VoiceFrame : pitch/énergie/périodicité) |
| **VAD** | Silero v5 | Silero reste la référence (2 Mo) ; TEN VAD (annoncé plus précis/latence plus faible) et FireRedVAD : **revendications éditeur, pas de benchmark indépendant** ; rien trouvé spécifiquement sur « Silero v6 » | **Garder Silero**, test de rétro-vérification possible, enjeu faible |
| **Anonymisation (NER)** | BERT ONNX (prévu) | Désormais des modèles **PII français prêts à l'emploi** : **OpenMed-PII-French** (149 M à 568 M ; variantes ONNX/Android ; ciblent texte clinique), **GLiNER-PII** (zéro-shot), dérivés du *privacy-filter*. react-native-executorch a une tâche `privacyFilter` | **Ne pas entraîner/choisir un BERT maintenant** : évaluer OpenMed-FR vs GLiNER-PII sur vos transcripts (qualité réelle inconnue) |

### 10.1 Faisabilité ExecuTorch (ce qui est prouvé / non prouvé)

- **Prouvé** : exports officiels PyTorch de **Parakeet TDT** (encodeur/décodeur/joint en 3 méthodes d'un même `.pte`, décodage TDT et timestamps mot/segment en **C++**), **Voxtral Realtime**, **Sortformer**, **Whisper**, **Silero VAD** (billet PyTorch 16/03/2026, LM Studio livre Parakeet via ExecuTorch).
- **Plateformes annoncées** : Parakeet = Linux/macOS/Windows/**Android** (XNNPACK, Vulkan, Metal) ; Whisper = + Android/Qualcomm ; Sortformer et Silero = desktop. **iOS n'est annoncé pour aucun d'eux** (un `.pte` Parakeet MLX ≈ 470 Mo existe côté Apple Silicon) → **risque iOS réel**, à vérifier par build.
- **Dans `react-native-executorch` 0.10.7** : seul Whisper (≤ small) + VAD FSMN. Parakeet/Sortformer/Silero ne sont **pas** exposés : il faudrait écrire l'orchestration (boucle TDT, LSTM, timestamps) en JS (`loadModel` + schema) ou en C++ — c'est exactement la partie que le billet fait en C++.
- **Ce n'est donc pas gratuit côté ExecuTorch non plus** ; côté ONNX, des exports communautaires existent (Parakeet ONNX, OpenMed ONNX/Android, CAM++ ONNX officiel) mais la boucle de décodage reste à écrire aussi.

### 10.2 Compat. RN 0.88 / SDK 58 (recherche)

Aucune issue ni mention trouvée sur `react-native-executorch` × RN 0.87/0.88/SDK 58 ; la table officielle s'arrête à RN 0.86 / SDK 57 ; le `package.json` publié accepte worklets `<0.14`. **Ni confirmé ni infirmé** : seul un build tranche (porte 1 du §9.3). SDK 58 impose le Strict TypeScript API (déjà géré, §4).

### 10.3 Autres pistes écartées

- **`react-native-sherpa-onnx`** (XDcobra, 41 ★, MIT, bundle sherpa-onnx 1.12.35) : bonne couverture ASR (Whisper, Moonshine, SenseVoice, Qwen3-ASR, Canary…) mais **VAD « prévu en 0.7.0 », diarisation « 0.5.0 », embedding locuteur non mentionné** ; Parakeet non listé comme famille. Pas un candidat pour votre pipeline aujourd'hui.
- **Voxtral (4 B)** et **Whisper large** : trop lourds pour un traitement différé sur téléphone.

### 10.4 Conséquence sur la décision de runtime

Le choix de runtime **découle** du choix des modèles : *(1)* trancher ASR (Parakeet v3 vs Whisper small/turbo), *(2)* vérifier qu'il tourne sur **iOS et Android** avec timestamps mot, *(3)* alors seulement choisir ExecuTorch / ORT. Le spike §9.3 doit donc **tester Parakeet TDT 0.6B v3** (et pas seulement Whisper small) sur les deux plateformes, et mesurer WER/RTF sur un échantillon FR représentatif.

*Instantané technique — état post-migration SDK 58 (26/10/2026). Mettre à jour à chaque étape significative.*
