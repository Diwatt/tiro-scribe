---
description: "Forbid default exports - always use named exports"
alwaysApply: true
---

# No Default Exports

**Rule**: Never use `export default` in this codebase. Always use named exports.

## Why
- Named exports make imports explicit and easier to refactor
- Better tree-shaking support
- Clearer dependency tracking
- Consistent codebase style

## Examples

❌ **Don't:**
```typescript
export default function MyComponent() { ... }
export default class MyClass { ... }
```

✅ **Do:**
```typescript
export function MyComponent() { ... }
export class MyClass { ... }
```

## Import Pattern

❌ **Don't:**
```typescript
import MyComponent from './MyComponent';
```

✅ **Do:**
```typescript
import {MyComponent} from './MyComponent';
```

## Exceptions

**Storybook stories**: Storybook requires `export default meta` in story files. This is the only exception and is required by the Storybook API.
