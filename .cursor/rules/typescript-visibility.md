---
description: "TypeScript visibility modifiers - all class members must have explicit visibility"
alwaysApply: true
globs: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Visibility Modifiers

Part of TypeScript standards. See `typescript.md` for the full guidelines.

**Rule**: **ALL** class members (properties, methods, getters, setters, static members) MUST have explicit visibility modifiers. Never use implicit `public`.

## Why
- Explicit visibility makes code intent clear and prevents accidental exposure of internals
- Improves maintainability and refactoring safety

## Visibility Modifiers

- `public` - Accessible from anywhere (MUST be explicit, never implicit)
- `private` - Only accessible within the class
- `protected` - Accessible within the class and subclasses
- `readonly` - Can be combined with visibility modifiers

## Required Visibility

**ALL** of the following MUST have explicit visibility:
- Properties (instance and static)
- Methods (instance and static)
- Getters
- Setters
- Constructor parameters (when using access modifiers)

## Examples

❌ **Don't (implicit public):**
```typescript
class MyClass {
  myMethod() { ... }                    // ❌ Missing 'public'
  myProperty: string;                   // ❌ Missing 'public'
  static fromRaw(data: Data) { ... }    // ❌ Missing 'public static'
  get value(): string { ... }           // ❌ Missing 'public get'
  set value(v: string) { ... }          // ❌ Missing 'public set'
}
```

✅ **Do (explicit visibility):**
```typescript
class MyClass {
  public myMethod(): void { ... }                    // ✅ Explicit public
  private myHelper(): void { ... }                    // ✅ Explicit private
  protected myProperty: string;                        // ✅ Explicit protected
  public static fromRaw(data: Data): MyClass { ... }  // ✅ Explicit public static
  public get value(): string { ... }                  // ✅ Explicit public get
  public set value(v: string) { ... }                 // ✅ Explicit public set
}
```

## Static Members

Static members MUST have explicit visibility:

❌ **Don't:**
```typescript
class MyClass {
  static property: string;              // ❌ Missing 'public static'
  static fromRaw(data: Data): MyClass { ... }  // ❌ Missing 'public static'
  static #privateStatic: number;       // ❌ Use 'private static' instead of #
}
```

✅ **Do:**
```typescript
class MyClass {
  public static property: string;                    // ✅ Explicit public static
  public static fromRaw(data: Data): MyClass { ... } // ✅ Explicit public static
  private static helper(): void { ... }             // ✅ Explicit private static
}
```

## Getters/Setters

Getters and setters MUST have explicit visibility:

❌ **Don't:**
```typescript
class MyClass {
  get value(): string { ... }           // ❌ Missing 'public get'
  set value(v: string) { ... }          // ❌ Missing 'public set'
  get privateValue(): number { ... }    // ❌ Missing 'private get'
}
```

✅ **Do:**
```typescript
class MyClass {
  public get value(): string { ... }        // ✅ Explicit public get
  public set value(v: string) { ... }       // ✅ Explicit public set
  private get privateValue(): number { ... } // ✅ Explicit private get
}
```

## Constructor Parameters

When using access modifiers in constructor parameters, they MUST be explicit:

❌ **Don't:**
```typescript
class MyClass {
  constructor(
    param: string,              // ❌ If public, must be explicit
    private helper: number      // ✅ OK - explicit private
  ) {}
}
```

✅ **Do:**
```typescript
class MyClass {
  constructor(
    public param: string,       // ✅ Explicit public
    private helper: number      // ✅ Explicit private
  ) {}
}
```

## Abstract Classes

Abstract methods MUST have explicit visibility:

❌ **Don't:**
```typescript
abstract class Base {
  abstract method(): void;      // ❌ Missing 'public abstract'
}
```

✅ **Do:**
```typescript
abstract class Base {
  public abstract method(): void;  // ✅ Explicit public abstract
  protected abstract helper(): void; // ✅ Explicit protected abstract
}
```

## Exceptions

- **Interfaces**: Methods and properties in interfaces don't need visibility modifiers (they're always public by definition)
- **Type aliases**: Don't need visibility modifiers (not class members)
- **Object literals**: Don't need visibility modifiers (not class members)

## Enforcement

This rule applies to:
- All class declarations
- All class members (properties, methods, getters, setters)
- All static members
- All abstract members
- Constructor parameters with access modifiers

**No exceptions** - if it's a class member, it MUST have an explicit visibility modifier.
