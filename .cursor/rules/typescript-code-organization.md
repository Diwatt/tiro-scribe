---
description: "TypeScript code organization - properties first, then methods, ordered by visibility"
alwaysApply: true
globs: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Code Organization

Part of TypeScript standards. See `typescript.md` for the full guidelines.

**Rule**: **properties first** → **constructor** → **methods**. Getters and setters are methods. Within each section, order by visibility: **public → protected → private**. Explicit visibility required; see `typescript-visibility.md`.

## Structure

```typescript
class MyClass {
  // --- Properties (public → protected → private) ---
  public static publicStaticProp: string;
  public readonly publicProperty: string;
  public publicVar: number;

  protected readonly protectedProperty: string;
  protected protectedVar: number;

  private static privateStaticProp: string;
  private readonly privateProperty: string;
  private privateVar: number;

  // --- Constructor ---
  public constructor(param: string) {
    this.privateProperty = param;
  }

  // --- Methods (public → protected → private; getters/setters are methods) ---
  public get publicGetter(): string { return this.publicProperty; }
  public set publicSetter(v: string) { this.publicVar = v; }
  public publicMethod(): void { }

  protected protectedMethod(): void { }

  private get privateGetter(): string { return this.privateProperty; }
  private set privateSetter(v: string) { this.privateVar = v; }
  private privateMethod(): void { }

  public static publicStaticMethod(): void { }
  private static privateStaticMethod(): void { }
}
```

## Ordering Rules

1. **Properties** – All properties first (instance and static), ordered by visibility: public → protected → private.
2. **Constructor** – Immediately after properties, before methods.
3. **Methods** – All methods after the constructor (including getters and setters). Order by visibility: public → protected → private. Getters and setters are not a separate section; they are methods.

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
  public publicProperty: string;        // ✅ Public property first
  protected protectedProperty: string; // ✅ Protected property, explicit visibility
  private privateProperty: string;     // ✅ Private property last
  public publicMethod(): void { }      // ✅ Public method first
  protected protectedMethod(): void { } // ✅ Protected method
  private privateMethod(): void { }    // ✅ Private method last
}
```

## Interfaces and Types

- **Interfaces**: Properties first, then methods (no visibility needed - always public)
- **Type aliases**: No specific ordering needed (usually simple)

## Combined with Visibility Rule

This rule works together with `typescript-visibility.md`:
- **Organization** (this file): Defines WHERE members go
- **Visibility** (typescript-visibility.md): Defines HOW members are declared (explicit modifiers required)

Both rules MUST be followed simultaneously.
