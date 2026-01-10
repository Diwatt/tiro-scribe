# Refactoring Plan: Symfony-Style PascalCase Singular Architecture

## Current Structure Analysis

```
src/
  - App.tsx
  - core/
    - models/
      - index.ts
      - types.ts
    - services/
      - AnonymizerService.ts
      - AudioProcessingService.ts
      - BiocodeService.ts
      - index.ts
      - README.md
    - store/
      - useAppStore.ts
    - utils/
      - constants.ts
  - database/
    - index.ts
    - schema.ts
  - features/
    - recording/
      - hooks/
        - useAudioRecording.ts
  - navigation/
    - AppNavigator.tsx
```

## Target Structure (Symfony-Style)

```
src/
  - App.tsx
  - Model/                    # Generic models (shared across features)
    - index.ts
    - Type.ts                 # types.ts → Type.ts (PascalCase)
  - Service/                  # Generic services (shared across features)
    - AnonymizerService.ts
    - AudioProcessingService.ts
    - BiocodeService.ts
    - index.ts
    - README.md
  - Store/                    # Generic store (shared across features)
    - AppStore.ts             # useAppStore.ts → AppStore.ts (hook file, not function)
  - Util/                     # Generic utils (shared across features)
    - Constant.ts             # constants.ts → Constant.ts
  - Database/                 # Database layer
    - index.ts
    - Schema.ts               # schema.ts → Schema.ts
  - Navigation/               # Navigation layer
    - AppNavigator.tsx
  - Recording/                # Feature: Recording (from features/recording)
    - Hook/                   # hooks → Hook (singular)
      - AudioRecording.ts     # useAudioRecording.ts → AudioRecording.ts (hook file, not function)
```

## File Moves

### Generic/Shared Code (Top-Level)

1. `src/core/models/` → `src/Model/`
   - `src/core/models/types.ts` → `src/Model/Type.ts`
   - `src/core/models/index.ts` → `src/Model/index.ts`

2. `src/core/services/` → `src/Service/`
   - All service files remain (already PascalCase)
   - `src/core/services/index.ts` → `src/Service/index.ts`
   - `src/core/services/README.md` → `src/Service/README.md`

3. `src/core/store/` → `src/Store/`
   - `src/core/store/useAppStore.ts` → `src/Store/AppStore.ts`

4. `src/core/utils/` → `src/Util/`
   - `src/core/utils/constants.ts` → `src/Util/Constant.ts`

5. `src/database/` → `src/Database/`
   - `src/database/schema.ts` → `src/Database/Schema.ts`
   - `src/database/index.ts` → `src/Database/index.ts`

6. `src/navigation/` → `src/Navigation/`
   - `src/navigation/AppNavigator.tsx` → `src/Navigation/AppNavigator.tsx`

### Feature Code

7. `src/features/recording/` → `src/Recording/`
   - `src/features/recording/hooks/` → `src/Recording/Hook/`
   - `src/features/recording/hooks/useAudioRecording.ts` → `src/Recording/Hook/AudioRecording.ts`

## Import Path Updates

### Path Aliases (tsconfig.json & babel.config.js)

**Old:**
- `@services/*` → `src/core/services/*`
- `@models/*` → `src/core/models/*`
- `@utils/*` → `src/core/utils/*`
- `@features/*` → `src/features/*`
- `@navigation/*` → `src/navigation/*`
- `@core/*` → `src/core/*`

**New:**
- `@Service/*` → `src/Service/*`
- `@Model/*` → `src/Model/*`
- `@Util/*` → `src/Util/*`
- `@Navigation/*` → `src/Navigation/*`
- `@Database/*` → `src/Database/*`
- `@Recording/*` → `src/Recording/*`

### Files Requiring Import Updates

1. `src/App.tsx`
   - Update: `./navigation/AppNavigator` → `./Navigation/AppNavigator`
   - Update: `./core/services` → `./Service`
   - Update: `./core/utils/constants` → `./Util/Constant`

2. `src/Service/BiocodeService.ts`
   - Update: `../models/types` → `../Model/Type`

3. `src/Service/AnonymizerService.ts`
   - Update: `../models/types` → `../Model/Type`

4. `src/Service/AudioProcessingService.ts`
   - Update: `./BiocodeService` → `./BiocodeService` (same directory)
   - Update: `./AnonymizerService` → `./AnonymizerService` (same directory)
   - Update: `../models/types` → `../Model/Type`

5. `src/Store/UseAppStore.ts`
   - Update: `../models/types` → `../Model/Type`

6. `src/Recording/Hook/AudioRecording.ts`
   - Update: `@services/AudioProcessingService` → `@Service/AudioProcessingService`
   - Update: `@core/store/useAppStore` → `@Store/AppStore`
   - Update: `@core/models/types` → `@Model/Type`

7. `src/Database/Schema.ts`
   - No changes (external import)

8. `src/Database/index.ts`
   - Update: `./schema` → `./Schema`

9. `src/Navigation/AppNavigator.tsx`
   - No changes (external imports only)

## ESLint Configuration

Add rules to enforce:
- Directory names must be PascalCase
- Directory names must be Singular
- File names for components/classes must be PascalCase

## Summary

- **Directories to create:** 7 (Model, Service, Store, Util, Database, Navigation, Recording/Hook)
- **Directories to remove:** 4 (core, database, features, navigation)
- **Files to rename:** 6 (types.ts, constants.ts, schema.ts, useAppStore.ts, useAudioRecording.ts)
- **Import statements to update:** ~15-20 files
