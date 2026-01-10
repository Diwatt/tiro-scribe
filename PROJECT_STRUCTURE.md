# Project Structure

This document outlines the complete project structure and organization.

## Root Directory

```
open-luborsky-mobile/
├── .cursor/                    # Cursor IDE rules
│   └── rules/                  # Project-specific rules
├── src/                        # Source code
├── .eslintrc.js                # ESLint configuration
├── .gitignore                  # Git ignore rules
├── .prettierrc.js              # Prettier configuration
├── app.json                    # App metadata
├── babel.config.js             # Babel configuration
├── index.js                    # App entry point
├── metro.config.js             # Metro bundler config
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript configuration
├── README.md                   # Main documentation
├── NATIVE_MODULES_SETUP.md     # Native module setup guide
└── PROJECT_STRUCTURE.md        # This file
```

## Source Code Structure (`src/`)

### Core Layer (`src/core/`)

**Models** (`src/core/models/`)
- `types.ts` - Core type definitions and interfaces
- `index.ts` - Barrel export

**Services** (`src/core/services/`)
- `BiocodeService.ts` - Voice identity and salting
- `AnonymizerService.ts` - Hybrid NLP anonymization
- `AudioProcessingService.ts` - Complete audio pipeline orchestration
- `index.ts` - Barrel export
- `README.md` - Service documentation

**Store** (`src/core/store/`)
- `useAppStore.ts` - Zustand global state

**Utils** (`src/core/utils/`)
- `constants.ts` - Application constants

### Features Layer (`src/features/`)

**Recording** (`src/features/recording/`)
- `hooks/useAudioRecording.ts` - Audio recording hook

*Additional features can be added following this pattern:*
- `features/{feature-name}/`
  - `components/` - Feature-specific components
  - `hooks/` - Feature-specific hooks
  - `types.ts` - Feature-specific types
  - `index.ts` - Feature exports

### Navigation (`src/navigation/`)
- `AppNavigator.tsx` - Main navigation setup

### Database (`src/database/`)
- `schema.ts` - WatermelonDB schema definition
- `index.ts` - Database initialization

### App Entry (`src/`)
- `App.tsx` - Main application component

## Cursor Rules (`.cursor/rules/`)

1. **privacy-by-design/RULE.md** - Privacy-by-Design architecture principles
2. **clean-architecture/RULE.md** - Clean Architecture patterns
3. **ai-services/RULE.md** - AI service implementation patterns
4. **typescript/RULE.md** - TypeScript coding standards
5. **offline-first/RULE.md** - Offline-first and WatermelonDB patterns

## Key Files

### Configuration Files
- `package.json` - All dependencies (including peer dependencies for native modules)
- `tsconfig.json` - TypeScript configuration with path aliases
- `babel.config.js` - Babel config with module resolver
- `metro.config.js` - Metro bundler configuration

### Core Services

#### BiocodeService
- **Purpose**: Voice identity and patient biocode generation
- **Key Methods**:
  - `initialize()` - Initialize with sherpa-onnx module
  - `setTherapistSalt()` - Set therapist salt for patient ID generation
  - `processAudio()` - Extract biocode from audio
  - `generateBiocode()` - Generate patient ID from speaker vector

#### AnonymizerService
- **Purpose**: Three-layer text anonymization
- **Key Methods**:
  - `initialize()` - Initialize with ONNX Runtime and model
  - `setSessionStartDate()` - Set session date for temporal fuzzing
  - `anonymize()` - Main anonymization method
  - `reset()` - Reset for new session

#### AudioProcessingService
- **Purpose**: Orchestrate complete audio processing pipeline
- **Key Methods**:
  - `initialize()` - Initialize with whisper.rn module
  - `processAudio()` - Complete pipeline processing
  - `processAudioDetailed()` - Detailed processing with intermediate results

## Path Aliases

Configured in `tsconfig.json` and `babel.config.js`:

- `@/*` → `src/*`
- `@services/*` → `src/core/services/*`
- `@models/*` → `src/core/models/*`
- `@utils/*` → `src/core/utils/*`
- `@features/*` → `src/features/*`
- `@navigation/*` → `src/navigation/*`
- `@core/*` → `src/core/*`

## Database Schema

WatermelonDB tables:
- `sessions` - Therapy session metadata
- `recordings` - Processed audio recordings
- `sync_queue` - Offline sync queue

## Next Steps

1. **Install Native Modules**: Follow `NATIVE_MODULES_SETUP.md`
2. **Set up WatermelonDB Models**: Create model classes for each table
3. **Implement UI Components**: Build feature screens and components
4. **Add Backend Integration**: Implement sync service for backend API
5. **Testing**: Add unit and integration tests

## Development Workflow

1. **Feature Development**: Create features in `src/features/`
2. **Service Updates**: Modify services in `src/core/services/`
3. **Type Definitions**: Add types to `src/core/models/types.ts`
4. **State Management**: Use Zustand store in `src/core/store/`
5. **Database**: Define schemas in `src/database/schema.ts`

## Architecture Principles

- **Privacy-First**: All processing on-device
- **Offline-First**: WatermelonDB for local storage
- **Clean Architecture**: Separation of concerns
- **Feature-Based**: Self-contained feature modules
- **Type Safety**: Strict TypeScript configuration
