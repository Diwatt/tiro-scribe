---
description: "TypeScript code organization - properties first, then methods, ordered by visibility"
alwaysApply: true
---

# TypeScript Code Organization

**Rule**: Organize TypeScript code with properties first, then methods. Within each section, order by visibility: private, then protected, then public. **ALL members MUST have explicit visibility modifiers.**

## Structure

```typescript
class MyClass {
  // 1. Properties (private first)
  private readonly privateProperty: string;
  private privateVar: number;
  
  // 2. Properties (protected)
  protected readonly protectedProperty: string;
  protected protectedVar: number;
  
  // 3. Properties (public)
  public readonly publicProperty: string;
  public publicVar: number;
  
  // 4. Static properties (private first)
  private static privateStaticProp: string;
  public static publicStaticProp: string;
  
  // 5. Constructor (after properties, before methods)
  constructor(param: string) {
    this.privateProperty = param;
  }
  
  // 6. Getters (private first)
  private get privateGetter(): string { return this.privateProperty; }
  public get publicGetter(): string { return this.publicProperty; }
  
  // 7. Setters (private first)
  private set privateSetter(v: string) { this.privateVar = v; }
  public set publicSetter(v: string) { this.publicVar = v; }
  
  // 8. Methods (private first)
  private privateMethod(): void { }
  
  // 9. Methods (protected)
  protected protectedMethod(): void { }
  
  // 10. Methods (public)
  public publicMethod(): void { }
  
  // 11. Static methods (private first)
  private static privateStaticMethod(): void { }
  public static publicStaticMethod(): void { }
}
```

## Ordering Rules

1. **Properties before methods** - All properties come first, then all methods
2. **Visibility ordering within sections** - private → protected → public
3. **Static members grouped separately** - Static properties, then static methods
4. **Constructor** - Place after properties, before methods
5. **Getters/Setters** - Group with properties section, following visibility order
6. **Abstract methods** - Place in appropriate visibility section
7. **Explicit visibility required** - ALL members MUST have explicit visibility modifiers (see typescript-visibility.md)

## Examples

❌ **Don't:**
```typescript
class MyClass {
  publicMethod(): void { }              // ❌ Missing 'public', wrong order
  private property: string;            // ❌ Wrong order (should be before methods)
  protectedMethod(): void { }           // ❌ Missing 'protected', wrong order
}
```

✅ **Do:**
```typescript
class MyClass {
  private property: string;             // ✅ Private property first
  protected protectedMethod(): void { } // ✅ Protected method, explicit visibility
  public publicMethod(): void { }       // ✅ Public method, explicit visibility
}
```

## Visibility Enforcement

**CRITICAL**: All class members MUST have explicit visibility modifiers. See `typescript-visibility.md` for details.

- Properties: `private`, `protected`, or `public` (never implicit)
- Methods: `private`, `protected`, or `public` (never implicit)
- Getters: `private get`, `protected get`, or `public get` (never implicit)
- Setters: `private set`, `protected set`, or `public set` (never implicit)
- Static members: `private static`, `protected static`, or `public static` (never implicit)

## Interfaces and Types

- **Interfaces**: Properties first, then methods (no visibility needed - always public)
- **Type aliases**: No specific ordering needed (usually simple)

## Combined with Visibility Rule

This rule works together with `typescript-visibility.md`:
- **Organization** (this file): Defines WHERE members go
- **Visibility** (typescript-visibility.md): Defines HOW members are declared (explicit modifiers required)

Both rules MUST be followed simultaneously.
