---
description: "TypeScript coding standards and type safety requirements"
alwaysApply: true
---

# TypeScript Rules

## Type Safety Requirements

1. **Strict Mode**: Always use `strict: true` in tsconfig.json
2. **No `any` Types**: Avoid `any` - use `unknown` or proper types
3. **Explicit Return Types**: Define return types for all functions
4. **Interface over Type**: Prefer `interface` for object shapes, `type` for unions/intersections

## Type Definitions

### Service Interfaces
Define interfaces for native modules in service files:

```typescript
interface NativeModuleInterface {
  methodName(param: Type): Promise<ReturnType>;
}
```

### Model Types
Define all data models in `@models/types.ts`:

```typescript
export interface ProcessingPayload {
  biocode: string;
  cleanTranscript: string;
  confidence: number;
  sessionId: string;
  timestamp: number;
}
```

## Path Aliases

Use path aliases for imports:
- `@services/*` → `src/core/services/*`
- `@models/*` → `src/core/models/*`
- `@utils/*` → `src/core/utils/*`
- `@features/*` → `src/features/*`
- `@navigation/*` → `src/navigation/*`
- `@core/*` → `src/core/*`

## Enums

Use `enum` for fixed sets of values:

```typescript
export enum EntityType {
  PERSON = 'PERSON',
  LOCATION = 'LOCATION',
  // ...
}
```

## Optional vs Nullable

- Use `?` for optional properties: `property?: string`
- Use `| null` for explicitly nullable: `property: string | null`
- Prefer optional over nullable when possible

## Async/Await

- Always use `async/await` over `.then()` chains
- Always handle errors with try/catch
- Return `Promise<T>` explicitly for async functions

## Generic Types

Use generics for reusable components/services:

```typescript
interface Service<TInput, TOutput> {
  process(input: TInput): Promise<TOutput>;
}
```
