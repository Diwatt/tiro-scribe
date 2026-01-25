---
description: "Kotlin visibility modifiers - all class members must have explicit visibility"
alwaysApply: true
---

# Kotlin Visibility Modifiers

**Rule**: **ALL** class members (properties, methods, constructors, companion objects) MUST have explicit visibility modifiers. Never use implicit `public`.

## Why
- Explicit visibility makes code intent clear and unambiguous
- Prevents accidental exposure of internal implementation details
- Improves code maintainability and readability
- Makes refactoring safer (explicit intent)
- Aligns with Kotlin best practices and strict coding standards

## Visibility Modifiers

- `private` - Only accessible within the same class
- `protected` - Accessible within the class and subclasses
- `internal` - Accessible within the same module
- `public` - Accessible from anywhere (MUST be explicit, never implicit)

## Required Visibility

**ALL** of the following MUST have explicit visibility:
- Properties (instance and companion)
- Methods (instance and static)
- Constructors
- Companion object members
- Nested classes

## Examples

❌ **Don't (implicit public):**
```kotlin
class MyClass {
  fun myMethod() { ... }              // ❌ Missing 'public' or 'private'
  val myProperty: String              // ❌ Missing 'public' or 'private'
  companion object {
    fun helper() { ... }              // ❌ Missing 'public' or 'private'
  }
  constructor(param: String) { ... } // ❌ Missing 'public' or 'private'
}
```

✅ **Do (explicit visibility):**
```kotlin
class MyClass {
  public fun myMethod() { ... }              // ✅ Explicit public
  private fun myHelper() { ... }             // ✅ Explicit private
  private val myProperty: String             // ✅ Explicit private
  companion object {
    public fun helper() { ... }              // ✅ Explicit public
    private fun privateHelper() { ... }      // ✅ Explicit private
  }
  public constructor(param: String) { ... }  // ✅ Explicit public constructor
}
```

## Companion Objects

Companion object members MUST have explicit visibility:

❌ **Don't:**
```kotlin
class MyClass {
  companion object {
    const val CONSTANT = "value"     // ❌ Missing 'public const' or 'private const'
    fun helper() { ... }              // ❌ Missing 'public fun' or 'private fun'
  }
}
```

✅ **Do:**
```kotlin
class MyClass {
  companion object {
    public const val CONSTANT = "value"      // ✅ Explicit public const
    private fun helper() { ... }             // ✅ Explicit private fun
  }
}
```

## Properties

Properties MUST have explicit visibility:

❌ **Don't:**
```kotlin
class MyClass {
  val property: String                // ❌ Missing 'public val' or 'private val'
  var mutable: Int                   // ❌ Missing 'public var' or 'private var'
}
```

✅ **Do:**
```kotlin
class MyClass {
  public val property: String        // ✅ Explicit public val
  private var mutable: Int           // ✅ Explicit private var
}
```

## Constructors

Constructors MUST have explicit visibility:

❌ **Don't:**
```kotlin
class MyClass {
  constructor(param: String) { ... } // ❌ Missing 'public constructor' or 'private constructor'
}
```

✅ **Do:**
```kotlin
class MyClass {
  public constructor(param: String) { ... }  // ✅ Explicit public constructor
  private constructor() { ... }              // ✅ Explicit private constructor
}
```

## Data Classes

Data class properties in primary constructor MUST have explicit visibility:

❌ **Don't:**
```kotlin
data class MyData(
  val property: String,               // ❌ Missing 'public val' or 'private val'
  private helper: Int                // ✅ OK - explicit private
)
```

✅ **Do:**
```kotlin
data class MyData(
  public val property: String,        // ✅ Explicit public val
  private val helper: Int            // ✅ Explicit private val
)
```

## Exceptions

- **Interface members**: Don't need visibility modifiers (they're always public by definition)
- **Top-level declarations**: Can use implicit public, but explicit is preferred for consistency

## Enforcement

This rule applies to:
- All class declarations
- All data class declarations
- All object declarations
- All companion objects
- All sealed classes
- All enum classes (except enum constants)

**No exceptions** - if it's a class member, it MUST have an explicit visibility modifier.
