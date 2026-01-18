---
description: "TypeScript coding standards and conventions"
alwaysApply: true
globs: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Rules

## File Organization

- **One interface per file**: Each interface must be in its own file
- **Naming convention**: Use descriptive names for interfaces
  - ✅ `InterfaceModel.ts` (contains `InterfaceModel` interface)
  - ❌ `IModel.ts` (don't use "I" prefix)
  - ❌ `BaseModel.ts` (don't use "Base" prefix)

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
    readonly tableName: string;
    readonly schemaSpec: TableSchemaSpec;
}

// src/Model/MyModel.ts
import {Model} from '@nozbe/watermelondb';
import type {InterfaceModel} from './InterfaceModel';

export class MyModel extends Model implements InterfaceModel {
    public static readonly tableName = 'my_table';
    public static readonly schemaSpec: TableSchemaSpec = {
        name: 'my_table',
        columns: [...],
    };
    // ...
}
```

### Incorrect Structure

```typescript
// ❌ Don't use "I" prefix for interfaces
export interface IModel { ... }

// ❌ Don't use "Base" prefix
export abstract class BaseModel { ... }

// ❌ Don't use default exports
export default class MyModel { ... }

// ❌ Don't create unnecessary abstract classes
export abstract class AbstractModel extends Model { ... }
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
