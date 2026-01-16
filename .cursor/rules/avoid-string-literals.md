---
description: "Avoid string literals in conditionals and statements - prefer enums or constants"
alwaysApply: true
---

# Avoid String Literals in Conditionals

**Rule: Do NOT use string literals directly in conditionals or statements. Use enums or class constants instead.**

## Rationale
- Prevents typos and runtime errors
- Improves code maintainability
- Better IDE autocomplete and refactoring support
- Makes code more self-documenting

## Examples

✅ **Correct:**
```typescript
class MyStore {
    private static readonly PERMISSION_GRANTED = 'granted' as const;
    private static readonly STATUS_ACTIVE = 'active' as const;

    public async checkPermission(): Promise<void> {
        const {status} = await getPermission();
        if (status === MyStore.PERMISSION_GRANTED) {
            // ...
        }
    }
}
```

Or with enums:
```typescript
enum PermissionStatus {
    GRANTED = 'granted',
    DENIED = 'denied',
    UNDETERMINED = 'undetermined',
}

if (status === PermissionStatus.GRANTED) {
    // ...
}
```

❌ **Incorrect:**
```typescript
// Don't use string literals directly
if (status === 'granted') {  // ❌ String literal
    // ...
}

if (user.role === 'admin') {  // ❌ String literal
    // ...
}
```

## When to Use Constants vs Enums

- **Class constants**: For values specific to a single class
- **Enums**: For values shared across multiple files or representing a closed set of options
- **Module-level constants**: For values used across multiple classes in the same module

## Exception

String literals are acceptable for:
- User-facing messages and error text
- File paths and URLs (when not used in conditionals)
- Template strings and formatting
