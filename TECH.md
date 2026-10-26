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

### Résidus connus, non bloquants

- `expo-doctor` : 4 checks en échec, tous cosmétiques ou dev-only (script `storybook` vs binaire ; duplicate safe-area-context via `@storybook` devOnly ; faux positif non-CNG post-prebuild).
- **`@expo/dom-webview` / `@expo/metro-runtime` épinglés en deps root** (58.0.2 / 58.0.15) : le lockfile pnpm figeait ces transitives en 55 via des cycles de peer-variations que `pnpm update`/overrides ne ré-évaluent pas. ⚠️ **Ce n'est pas cosmétique** : le module natif Android d'une version incompatible s'enregistre au boot et crash l'app (`NoClassDefFoundError: AnyTypeProvider` — API Kotlin refactorée en SDK 58). Si les versions dérivent à nouveau, le symptôme est un crash au lancement de l'instance React.
- **Compatibilité 16 KB page size** (Android 15/16) : l'APK tourne en mode compatibilité — les seules libs confirmées non alignées sont les AAR Microsoft ONNX (`onnxruntime`, `onnxruntime_extensions4j_jni`, `onnxruntimejsi` : `LOAD segment not aligned`), le reste de la liste du checker étant des erreurs d'analyse. Non bloquant en dev ; **bloquant pour Google Play** (obligatoire Android 15+) → avant distribution : vérifier les variants 16 KB des AAR Microsoft, épingler, re-vérifier avec `check-elf-alignment`.
- **Build natif complet (`expo run:ios` / `run:android`) restant à exécuter** — la validation ultime (boot app + ORM décoré + CAM++). Prebuild, pods, bundle JS et hermesc sont déjà verts.
- Jest 29 conservé (jest-expo 58 accepte ^29 \|\| ^30) — passage Jest 30 possible en suivi séparé.

---

## TL;DR

**Oui, il y a une grosse upgrade à faire : Expo 55 → 58 et React Native 0.83.6 → 0.88** (3 SDK de retard, SDK 58 sorti le 15/10/2026). L'app est en avance sur un point (React 19.2, déjà le niveau SDK 56) et à jour sur deux libs critiques (`onnxruntime-react-native`, `@legendapp/state`).

Le projet porte **7 contournements techniques "on the edge"** (patch babel-preset, Hermes V1 forcé, plugin ONNX qui mute `node_modules`, build RN from source, etc.). Deux d'entre eux (Hermes V1 × worklets/reanimated, transforms Hermes) correspondent à des bugs **corrigés en route entre SDK 56 et 58** : la migration supprime donc de la dette en plus de rattraper le drift.

**Verdict : migrer maintenant, avant d'attaquer le chantier ASR.** Fenêtre de confort : le SDK 55 reste supporté en correctifs ~jusqu'à début 2027, mais chaque SDK intermédiaire creuse l'écart et le chemin 55→58 ne fera que s'allonger.

---

## 1. Position actuelle de la plateforme

| Brique | Installé | Dernier stable | Écart |
|---|---|---|---|
| Expo SDK | 55.0.23 | 58.0.19 (15/10/2026) | **3 majeurs** |
| React Native | 0.83.6 | 0.88.0 | 5 mineurs |
| React / react-dom | 19.2.0 | 19.3.1 | mineur — **déjà au niveau exigé par SDK 56+** |
| Moteur JS | Hermes **V1 forcé** (`useHermesV1: true`) | Hermes V1 par défaut dès RN 0.85/SDK 56 | le flag deviendra inutile |
| New Architecture | activée (`newArchEnabled=true`) | idem | ✅ |
| Node (engines) | `>=20.0.0` (CI sur Node 20) | Expo 58 exige `^22.13 \|\| ^24.3 \|\| >=26` ; Node 20 est EOL | **CI + engines à bumper** |
| iOS deployment target | 16.0 (app + podspec `secure-recorder`) | SDK 56+ exige **16.4** | à bumper |
| Android | compileSdk/target 36, Kotlin 2.0.21, minSdk 29 | SDK 58 compatible AGP 9 | re-généré par prebuild |

Environnement local : Node 24.12 ✅ (compatible Expo 58), pnpm 11.1.2, Xcode requis ≥ 26.4 dès SDK 56.

---

## 2. Inventaire des contournements « on the edge »

C'est le cœur du sujet. Chaque entrée = un contournement actif, son motif, sa fragilité, et ce que la migration change.

### 2.1 Patch pnpm `@react-native/babel-preset@0.83.6` — fragilité **haute**

`patches/@react-native__babel-preset@0.83.6.patch` ajoute `&& !isHermes` pour empêcher `plugin-transform-classes` de tourner sous Hermes.

- **Motif** : l'ORM maison (`@Entity/@Column`) utilise les decorators **2023-05**, dont le transform émet des blocs statiques `_initClass` que `plugin-transform-classes` détruit. Sous Hermes V1 (qui supporte les classes nativement), il faut laisser les classes telles quelles.
- **Fragilité** : patch épinglé à `0.83.6` exactement. **Chaque bump RN le casse** → à régénérer à chaque étape de migration (`pnpm patch`).
- **Redondance partielle** : `babel.config.js` force déjà `unstable_transformProfile: 'hermes-stable'` qui active la détection Hermes dans le preset. Le patch est la ceinture après les bretelles — à re-tester à chaque SDK (il est possible que le profil seul suffise sur RN récent).

### 2.2 Hermes V1 forcé (`useHermesV1: true`) — fragilité **moyenne, résolue en montant**

- En SDK 55/RN 0.83, Hermes V1 était un **opt-in anticipé** ; il devient le défaut en RN 0.85/SDK 56.
- **Historique de bugs connu** sur cette combinaison : régression mémoire Hermes V1 × `react-native-worklets`/`react-native-reanimated` (expo/expo#46519) et startup dév lent (#48298). Corrigées dans RN 0.86.2 / 0.86.3 (expo ≥ 57.0.9 / 57.0.17). Le projet tourne worklets 0.7.4 + reanimated 4.2.3 sous Hermes V1 sur RN 0.83 : rester sur 0.83, c'est rester sur la version d'Hermes dont les bugs ont été corrigés en aval.
- **Après migration** : retirer le flag (v1 = défaut) et re-vérifier l'interaction avec le point 2.1.

### 2.3 Plugin `plugins/withOnnxruntime` — fragilité **haute** (état vérifié par diff contre le tarball npm pristine 1.24.3)

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
- **Action** : après migration, tester si ces flags restent réellement nécessaires (probablement liés aux extensions ONNX). S'ils peuvent sauter, c'est le plus gros gain de temps de build disponible.

### 2.5 `withGradleLimits` (`workers.max=2`, daemon idle 10 s) — mitigations machine, pas des bugs

Limitation de RAM pour la compilation C++ parallèle. Complète le point 2.4 : si les prebuilts SDK 58 suffisent, ces limites deviennent probablement inutiles.

### 2.6 Metro custom — fragile mais standard

`unstable_enableSymlinks` + `unstable_enablePackageExports` (pnpm), `assetExts += onnx/ort`. Préfixes `unstable_` = API mouvante ; à re-vérifier à chaque SDK (les options stables peuvent les remplacer).

### 2.7 Divers natif

- `packagingOptions.pickFirst` (`libc++_shared.so`, `libfbjni.so`, `libonnxruntime.so`) : classique avec ORT, à conserver.
- `expo prebuild` **vide et régénère `ios/`+`android/` par défaut depuis SDK 57** : les dossiers natifs commités seront re-générés — s'assurer qu'aucun mod manuel non tracé n'existe (le Podfile inspecté est standard généré).
- `expo-main/` vide : résidu à supprimer.

---

## 3. Drift des dépendances JS (npm au 26/10/2026)

### Critiques (à traiter pendant la migration SDK, via `npx expo install --fix`)

| Paquet | Installé | Latest | Note |
|---|---|---|---|
| `expo-router` | 55.0.14 | 58.0.26 | SDK 56 : fork de react-navigation — voir §4 |
| `react-native-worklets` | 0.7.4 | 0.13.0 | peer RN `0.86–0.88` — **cassé si on reste sur 0.83** |
| `react-native-reanimated` | 4.2.3 | 4.7.1 | suit worklets |
| `react-native-screens` | 4.23.0 | 4.30.0 | |
| `react-native-gesture-handler` | 2.30.1 | ~2.32+ | |
| `kysely-expo` | 5.0.0 | 56.0.0 | **versionné sur le SDK** — bump obligatoire |
| `jest-expo` | 55.0.17 | 58.0.12 | passe à **Jest 30** (projet sur Jest 29) |
| `babel-preset-expo` | 55.0.21 | 58.0.20 | |

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
| `typescript` | 5.9.3 | **7.0.2** | Expo 56 tire TS 6.0.3 ; TS 7 = 2e étape, après stabilisation |
| `@biomejs/biome` | 2.4.4 | 2.6.3 | mineur |
| `@testing-library/react-native` | 13.3.3 | **14.1.0** | major — à caler avec le passage Jest 30 |
| `storybook` / `@storybook/react-native` | 10.2.x | 10.7.0 | mineur |

### À jour / sain (avec nuances)

- `onnxruntime-react-native` **1.24.3 = dernière version publiée sur npm** ✅ — MAIS la publication est rare : 7 mois sans release alors que le train ORT natif est à 1.30/1.32 (cf. §2.3). Ne pas confondre « npm à jour » et « projet ORT à jour ».
- `@legendapp/state` 2.1.15 = dernière ✅
- `react-native-paper` 5.15.0 → 5.15.3 (patch)
- `typesafe-i18n` 5.27.1 = dernière… **depuis longtemps** (projet stagnant en amont) — risque maintenance à garder à l'œil, pas d'action immédiate.

---

## 4. Chemin de migration 55 → 58 (breaking changes à absorber)

Ne pas sauter d'étapes : chaque SDK intermédiaire porte des breaks. 56 → 57 est explicitement « équivalent à une minor release ».

### Étape A — SDK 56 (RN 0.85, React 19.2 — déjà en place)

- **`expo-router` ne dépend plus de `react-navigation`** : codemod officiel `sdk-56-expo-router-react-navigation-replace`. Le projet a `@react-navigation/*` en deps et un `AppNavigator` mort (voir STATE.md) → **purger plutôt que migrer**.
- **iOS min 16.4** : `app.json` + `SecureRecorder.podspec` (le podspec exige `s.platforms = { :ios => '16.4' }`).
- Xcode ≥ 26.4 obligatoire.
- `expo-file-system` : `copy()`/`move()` deviennent async (`copySync`/`moveSync` pour l'ancien comportement) — le module Dev (`DevFileEncryptor`) et le `Downloader` sont concernés.
- `expo/fetch` devient le `globalThis.fetch` par défaut.
- TypeScript passe en 6.0.3 via `expo install --fix`.
- Hermes V1 devient le défaut (le flag `useHermesV1` devient no-op puis candidat à suppression).
- **Régénérer le patch babel-preset pour 0.85** + re-tester le boot avec entités décorées.

### Étape B — SDK 57 (RN 0.86) — la plus facile

- RN 0.86 « no breaking changes ». Embarque reanimated 4.5 / worklets 0.10.
- Prendre `expo@>=57.0.17` (correctifs Hermes V1 mémoire + startup dév).
- `expo prebuild` nettoie par défaut les dossiers natifs.

### Étape C — SDK 58 (RN 0.87+0.88, iOS 27)

- **Strict TypeScript API par défaut (RN 0.87)** : les deep imports `react-native/Libraries/*` deviennent des erreurs de type. Audit fait : **aucun deep import dans `src/` ni `app/`** ✅. Opt-out temporaire possible (`customConditions: ["react-native", "react-native-legacy-deep-imports"]`), retiré après 0.89.
- **Cycle de vie iOS scène (SceneDelegate.swift généré par prebuild)** : impacte le pattern d'AppDelegate ; le projet n'a pas d'AppDelegate custom connu → vérifier au re-prebuild.
- Suppressions RN : `InteractionManager`, `Touchable`, props `StatusBar` dépréciées, `Modal animated`… (grep à faire, a priori non utilisés).
- `expo-file-system` : `File.write()` devient async (`writeSync()` pour l'ancien comportement).
- `expo-sqlite` : libSQL supprimé (non utilisé ici).
- **R8/minify activé par défaut en release Android** → les libs à réflexion (nitro, ORT) peuvent nécessiter des règles ProGuard. Tester un build release.
- Node ≥ 22.13 / ≥ 24.3 exigé : bump `engines` + workflows CI (Node 20 = EOL).
- worklets 0.13 (peer RN 0.86–0.88), reanimated 4.7.
- Régénérer le patch babel-preset pour 0.88 (3e fois).

---

## 5. Risques propres au projet, par ordre de dangerosité

1. **Decorators 2023-05 × Hermes × RN 0.88** — le trio patch-babel/`hermes-stable`/Hermes V1. C'est la première chose à re-tester à chaque étape : boot app + chargement d'une entité ORM décorée. Si le bug upstream (transform-classes vs `_initClass`) a été corrigé dans Babel/RN récents, le patch peut être supprimé — sinon le régénérer.
2. **Plugin ONNX** — statut vérifié par diff pristine (§2.3) : le hack podspec et le fallback `binding.ts` restent **nécessaires** en 1.24.3 ; ré-exécuter `prebuild` après chaque `pnpm install` puis re-tester une inférence CAM++ réelle. Épingler les 3 AAR Gradle `latest.integration` (builds Android non reproductibles). Nettoyer le patch `binding.js` devenu no-op.
3. **`useFrameworks: 'static'` iOS** — historiquement en tension avec les prebuilts Expo ; si les XCFrameworks précompilés SDK 56+ entrent en conflit, choisir : garder static frameworks OU assouplir vers les prebuilts (gain de build massif).
4. **R8 en release (SDK 58)** — vérifier quick-crypto/nitro/ORT en build release.
5. **Santé type-check (136 erreurs, voir STATE.md)** — pas bloquant pour la migration (majorité dans `tests/` driftés), mais faire le ménage des imports cassés (`ServicesContext`…) **avant** de cumuler avec les erreurs Strict TS API.

---

## 6. Recommandations hors migration (rapides)

- **CI** : Node 20 → 24 (les deux workflows), et `engines.node` → `>=22.13`.
- Supprimer `expo-main/` (dossier vide), et à l'occasion le doublon Biome/ESLint (deux linters configurés ; `eslint.config.mjs` + plugins).
- `uuid` 14 + question `react-native-get-random-values` : à re-vérifier au bump (peut-être supprimable).
- `@types/node` 25 : à aligner sur la version Node CI.
- EAS non configuré (`projectId: null`) — sans objet tant qu'on build en local, à trancher avant toute distribution.

---

## 7. Plan d'exécution suggéré

1. **Pré-requis** : figer le working tree (cf. STATE.md, étape 1) — la migration doit partir d'un état commité propre.
2. `npx expo install expo@^56.0.0 --fix` → podspec 16.4, purger `@react-navigation/*` + `AppNavigator`, régénérer patch babel-preset (0.85), adapter `copy/move` async, prebuild:clean, pods, build iOS+Android, smoke test (boot + enregistrement + CAM++).
3. `npx expo install expo@^57.0.0 --fix` (prendre ≥ 57.0.17) → prebuild:clean, smoke test.
4. `npx expo install expo@^58.0.0 --fix` → bump CI/engines Node, régénérer patch babel-preset (0.88), retirer `useHermesV1`, test release Android (R8), smoke test complet.
4. Après stabilisation : tester la suppression de `buildReactNativeFromSource`/`useFrameworks: static` (gain builds ÷2), épingler les AAR Gradle ONNX (`latest.integration`), puis bumps indépendants (quick-crypto, zod, lucide 1.x, uuid 14, testing-library 14), puis TS 7 en dernier.
6. `npx expo-doctor@latest` à chaque étape.

Ordre des chantiers vs `STATE.md` : **la migration plateforme avant l'ASR** — implémenter Whisper (encoder/decoder/tokenizer ONNX) sur un SDK 55/Hermes V1 patché serait du travail sur du sable.

---

*Instantané technique — mettre à jour à chaque étape de migration.*
