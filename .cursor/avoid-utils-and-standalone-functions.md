# Avoid Utils and Standalone Functions

**Rule**: Avoid creating standalone utility functions and "utils" files as much as possible.

## Why
- Standalone functions create unnecessary abstraction layers
- Utils files become dumping grounds for unrelated code
- Code is more maintainable when logic lives close to where it's used
- Better encapsulation and cohesion

## When to Use Utils
- Only when the function is truly reusable across multiple unrelated components
- When the function is a pure transformation with no component-specific dependencies
- Mathematical/algorithmic utilities that are domain-agnostic

## Preferred Approaches
1. **Keep logic in the component** - If it's only used in one place, keep it there
2. **Create a class or object** - Group related functionality together
3. **Use a service/manager pattern** - For complex, stateful operations
4. **Create a dedicated module** - For domain-specific logic that belongs together

## Examples

❌ **Don't:**
```typescript
// utils/formatUtils.ts
export function formatDate(date: Date): string { ... }
export function formatCurrency(amount: number): string { ... }

// utils/animationUtils.ts
export function setupAnimations(...) { ... }
```

✅ **Do:**
```typescript
// Keep in component if only used there
function MyComponent() {
  const formatDate = (date: Date) => { ... };
  // ...
}

// Or create a dedicated class/module
class AnimationController {
  setupAnimations(...) { ... }
}
```
