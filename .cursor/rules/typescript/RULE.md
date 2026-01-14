---
description: "TypeScript coding standards and conventions"
alwaysApply: true
globs: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Rules

## File Organization

- **One interface per file**: Each interface must be in its own file
- **One abstract class per file**: Each abstract class must be in its own file
- **Naming convention**: Use `Abstract` prefix for abstract classes, not `Base`
  - ✅ `AbstractModel.ts` (contains `AbstractModel` class)
  - ✅ `InterfaceModel.ts` (contains `InterfaceModel` interface)
  - ❌ `BaseModel.ts` (contains both interface and abstract class)
  - ❌ `BaseWatermelonModel` (use `AbstractModel` instead)
  - ❌ `IWatermelonModel.ts` (use `InterfaceModel.ts` instead)

## Export Rules

- **NO default exports**: Always use named exports
  - ✅ `export class MyClass { ... }`
  - ✅ `export function myFunction() { ... }`
  - ❌ `export default class MyClass { ... }`
  - ❌ `export default function myFunction() { ... }`
  
- **Rationale**: Default exports cause issues with:
  - Tree-shaking and bundling
  - Circular dependencies
  - Refactoring and IDE support
  - Type inference in some cases

## Examples

### Correct Structure

```typescript
// src/Model/InterfaceModel.ts
export interface InterfaceModel {
    readonly table: string;
    readonly schema: TableSchema;
}

// src/Model/AbstractModel.ts
export abstract class AbstractModel extends Model {
    static abstract table: string;
    static abstract schema: TableSchema;
}

// src/Model/MyModel.ts
export class MyModel extends AbstractModel {
    // ...
}
```

### Incorrect Structure

```typescript
// ❌ Don't put interface and abstract in same file
// src/Model/BaseModel.ts
export interface InterfaceModel { ... }
export abstract class AbstractModel { ... }

// ❌ Don't use "Base" prefix
export abstract class BaseModel { ... }

// ❌ Don't use "I" prefix for interfaces (use InterfaceModel pattern)
export interface IModel { ... }

// ❌ Don't use default exports
export default class MyModel { ... }
```

## Access Modifiers

- **Explicit public modifiers**: Always use `public` modifier for public members
  - ✅ `public property: string;`
  - ✅ `public method(): void { ... }`
  - ✅ `public static getTable(): string { ... }`
  - ❌ `property: string;` (implicit public - not allowed)
  - ❌ `method(): void { ... }` (implicit public - not allowed)

- **Protected and private**: Use `protected` or `private` as appropriate
  - ✅ `protected internalProperty: string;`
  - ✅ `private helperMethod(): void { ... }`
