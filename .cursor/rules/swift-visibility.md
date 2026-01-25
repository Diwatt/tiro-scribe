---
description: "Swift visibility modifiers - all class members must have explicit visibility"
alwaysApply: true
---

# Swift Visibility Modifiers

**Rule**: **ALL** class members (properties, methods, initializers, static members) MUST have explicit visibility modifiers. Never use implicit `internal`.

## Why
- Explicit visibility makes code intent clear and unambiguous
- Prevents accidental exposure of internal implementation details
- Improves code maintainability and readability
- Makes refactoring safer (explicit intent)
- Aligns with Swift best practices and strict coding standards

## Visibility Modifiers

- `private` - Only accessible within the same source file/type
- `fileprivate` - Accessible within the same source file
- `internal` - Accessible within the same module (MUST be explicit, never implicit)
- `public` - Accessible from other modules
- `open` - Accessible and subclassable from other modules (classes only)

## Required Visibility

**ALL** of the following MUST have explicit visibility:
- Properties (stored, computed, static)
- Methods (instance and static)
- Initializers
- Subscripts
- Nested types

## Examples

❌ **Don't (implicit internal):**
```swift
class MyClass {
  func myMethod() { ... }              // ❌ Missing 'internal' or 'private'
  var myProperty: String               // ❌ Missing 'internal' or 'private'
  static func helper() { ... }         // ❌ Missing 'internal static' or 'private static'
  init(param: String) { ... }         // ❌ Missing 'internal' or 'private'
}
```

✅ **Do (explicit visibility):**
```swift
class MyClass {
  internal func myMethod() { ... }              // ✅ Explicit internal
  private func myHelper() { ... }              // ✅ Explicit private
  private var myProperty: String                // ✅ Explicit private
  internal static func helper() { ... }         // ✅ Explicit internal static
  private init(param: String) { ... }          // ✅ Explicit private init
}
```

## Static Members

Static members MUST have explicit visibility:

❌ **Don't:**
```swift
class MyClass {
  static let property = "value"        // ❌ Missing 'internal static' or 'private static'
  static func helper() { ... }         // ❌ Missing 'internal static' or 'private static'
}
```

✅ **Do:**
```swift
class MyClass {
  private static let property = "value"        // ✅ Explicit private static
  internal static func helper() { ... }        // ✅ Explicit internal static
}
```

## Computed Properties

Computed properties MUST have explicit visibility:

❌ **Don't:**
```swift
class MyClass {
  var value: String {                  // ❌ Missing 'internal var' or 'private var'
    return "value"
  }
}
```

✅ **Do:**
```swift
class MyClass {
  internal var value: String {         // ✅ Explicit internal var
    return "value"
  }
  private var helper: String {        // ✅ Explicit private var
    return "helper"
  }
}
```

## Initializers

Initializers MUST have explicit visibility:

❌ **Don't:**
```swift
class MyClass {
  init(param: String) { ... }         // ❌ Missing 'internal init' or 'private init'
}
```

✅ **Do:**
```swift
class MyClass {
  internal init(param: String) { ... } // ✅ Explicit internal init
  private init() { ... }              // ✅ Explicit private init
}
```

## Extensions

Extension members MUST have explicit visibility:

❌ **Don't:**
```swift
extension MyClass {
  func helper() { ... }               // ❌ Missing 'internal func' or 'private func'
}
```

✅ **Do:**
```swift
extension MyClass {
  private func helper() { ... }       // ✅ Explicit private func
  internal func publicHelper() { ... } // ✅ Explicit internal func
}
```

## Exceptions

- **Protocol requirements**: Don't need visibility modifiers (they're always public by definition)
- **Enum cases**: Don't need visibility modifiers (they're always public)
- **Top-level declarations**: Can use implicit internal, but explicit is preferred

## Enforcement

This rule applies to:
- All class declarations
- All struct declarations
- All enum declarations (except cases)
- All extension declarations
- All protocol extensions

**No exceptions** - if it's a type member, it MUST have an explicit visibility modifier.
