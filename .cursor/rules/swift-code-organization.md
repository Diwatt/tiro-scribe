# Swift Code Organization

**Rule**: Organize Swift code with properties first, then methods. Within each section, order by visibility: private, then internal/protected, then public. **ALL members MUST have explicit visibility modifiers.**

**IMPORTANT**: This rule works together with `swift-visibility.md` which requires explicit visibility modifiers for all class members.

## Structure

```swift
class MyClass {
  // 1. Properties (private first)
  private let privateProperty: String
  private var privateVar: Int
  
  // 2. Properties (internal/protected)
  internal let internalProperty: String
  var internalVar: Int
  
  // 3. Properties (public)
  public let publicProperty: String
  
  // 4. Methods (private first)
  private func privateMethod() { }
  
  // 5. Methods (internal/protected)
  func internalMethod() { }
  
  // 6. Methods (public)
  public func publicMethod() { }
}
```

## Ordering Rules

1. **Properties before methods** - All properties come first, then all methods
2. **Visibility ordering within sections** - private → internal/protected → public
3. **Initializers** - Place after properties, before methods, following visibility order
4. **Computed properties** - Group with regular properties, following visibility order

## Examples

❌ **Don't:**
```swift
class MyClass {
  public func publicMethod() { }
  private let property: String
  func internalMethod() { }
}
```

✅ **Do:**
```swift
class MyClass {
  private let property: String
  func internalMethod() { }
  public func publicMethod() { }
}
```
