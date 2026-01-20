# Ignore Backward Compatibility

**Rule**: Do not maintain backward compatibility (BC) when refactoring or updating code. Focus on current requirements and best practices.

## Principle

When making changes to the codebase:
- **Do not** preserve old APIs, deprecated methods, or legacy patterns for backward compatibility
- **Do** refactor and update code to use current best practices
- **Do** remove deprecated code instead of keeping it for compatibility
- **Do** update all usages when changing interfaces or APIs

## Rationale

- Reduces technical debt
- Keeps codebase clean and maintainable
- Forces proper migration of all dependent code
- Prevents accumulation of deprecated patterns

## Examples

❌ **Don't:**
```typescript
// Keeping old method for BC
public newMethod(): void { }
public oldMethod(): void { 
  // Deprecated: use newMethod() instead
  return this.newMethod();
}
```

✅ **Do:**
```typescript
// Just use the new method
public method(): void { }
// Remove oldMethod entirely and update all callers
```

## Migration Strategy

When breaking changes are needed:
1. Update all usages of the old API
2. Remove the old code completely
3. Do not leave deprecated wrappers or compatibility layers
