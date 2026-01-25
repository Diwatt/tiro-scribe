---
description: "Kotlin code organization - properties first, then methods, ordered by visibility"
alwaysApply: true
---

# Kotlin Code Organization

**Rule**: Organize Kotlin code with properties first, then methods. Within each section, order by visibility: private, then internal/protected, then public. **ALL members MUST have explicit visibility modifiers.**

**IMPORTANT**: This rule works together with `kotlin-visibility.md` which requires explicit visibility modifiers for all class members.

## Structure

```kotlin
class MyClass {
  // 1. Properties (private first)
  private val privateProperty: String
  private var privateVar: Int
  
  // 2. Properties (internal/protected)
  internal val internalProperty: String
  var internalVar: Int
  
  // 3. Properties (public)
  val publicProperty: String
  
  // 4. Initializers (after properties, before methods)
  init {
    // initialization code
  }
  
  // 5. Constructors (after init blocks)
  constructor(param: String) {
    // constructor code
  }
  
  // 6. Methods (private first)
  private fun privateMethod() { }
  
  // 7. Methods (internal/protected)
  fun internalMethod() { }
  
  // 8. Methods (public)
  public fun publicMethod() { }
}
```

## Ordering Rules

1. **Properties before methods** - All properties come first, then all methods
2. **Visibility ordering within sections** - private → internal/protected → public
3. **Initializers** - Place after properties, before methods
4. **Constructors** - Place after init blocks, before methods
5. **Companion objects** - Place at the end of the class
6. **Nested classes** - Place at the end, after companion objects

## Examples

❌ **Don't:**
```kotlin
class MyClass {
  public fun publicMethod() { }
  private val property: String
  fun internalMethod() { }
}
```

✅ **Do:**
```kotlin
class MyClass {
  private val property: String
  fun internalMethod() { }
  public fun publicMethod() { }
}
```
