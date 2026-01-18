---
description: "Clean Architecture and feature-based folder structure guidelines"
alwaysApply: true
---

# Clean Architecture Rules

## Folder Structure

This project follows Clean Architecture with feature-based organization:

```
src/
  core/           # Core business logic, shared across features
    models/       # Type definitions, interfaces
    services/     # Business logic services (AI, processing)
    store/        # Global state (Zustand)
    utils/        # Shared utilities
  features/       # Feature modules (self-contained)
    recording/    # Audio recording feature
    sessions/     # Session management feature
    ...
  navigation/     # Navigation configuration
  database/       # WatermelonDB schema and models
```

## Layer Responsibilities

### Core Layer
- **Models**: Type definitions, interfaces, enums
- **Services**: Business logic, AI processing, data transformation
- **Store**: Global application state
- **Utils**: Pure functions, constants, helpers

### Features Layer
- Each feature is self-contained
- Features can import from `core/` but not from other features
- Features expose hooks, components, and types
- Example structure:
  ```
  features/recording/
    components/
    hooks/
    types.ts
    index.ts
  ```

### Services Layer Rules
- Services are stateless classes (or functions)
- Services handle one domain concern (e.g., `BiocodeService`, `AnonymizerService`)
- Services can depend on other services via constructor injection
- Services should be initialized before use (async initialization pattern)

## Code Organization

1. **Imports**: Use path aliases (`@services`, `@models`, `@features`)
2. **Exports**: Use barrel exports (`index.ts`) for public APIs
3. **Types**: Define types in `models/` or feature-specific `types.ts`
4. **Services**: One service per file, export from `services/index.ts`

## Dependency Rules

- **Features** → **Core** (allowed)
- **Core** → **Core** (allowed)
- **Features** → **Features** (forbidden, use events/state instead)
- **Services** → **Services** (allowed via dependency injection)

## Naming Conventions

- Services: `*Service.ts` (e.g., `BiocodeService.ts`)
- Models: `types.ts` or descriptive names (e.g., `ProcessingPayload.ts`)
- Hooks: `use*.ts` (e.g., `useAudioRecording.ts`)
- Components: PascalCase (e.g., `RecordingScreen.tsx`)
