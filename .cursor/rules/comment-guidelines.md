---
description: "Comment and documentation guidelines"
alwaysApply: true
---

# Comment Guidelines

## Rule: Comments Should Not Be Redundant

**Never write comments that simply restate what the code already makes clear.**

### ❌ Bad Examples

```kotlin
/**
 * @param data Raw audio data chunk to encrypt and write
 */
fun write(data: ByteArray) {
  // Encrypts and writes the data
}
```

```typescript
/**
 * Gets the user's name
 * @param userId The ID of the user
 * @returns The user's name
 */
function getUserName(userId: string): string {
  return users[userId].name;
}
```

### ✅ Good Examples

```kotlin
/**
 * Encrypts and writes a chunk of data
 * 
 * SECURITY: Each chunk is encrypted independently with its own IV.
 * Format: [4-byte length][12-byte IV][encrypted data + 16-byte tag]
 * 
 * @throws IllegalStateException if stream not initialized
 */
fun write(data: ByteArray) {
  // Implementation details that aren't obvious from the method signature
}
```

```typescript
/**
 * Gets the user's name, falling back to email if name is unavailable
 * 
 * @param userId - Must be a valid user ID from the authenticated session
 * @returns User's display name or email address
 * @throws {UserNotFoundError} If userId doesn't exist
 */
function getUserName(userId: string): string {
  // Implementation with fallback logic
}
```

## When to Comment

**DO comment when:**
- Explaining **why** something is done (business logic, security rationale)
- Documenting **non-obvious** behavior or side effects
- Providing **context** that isn't in the code
- Explaining **constraints** or **limitations**
- Documenting **API contracts** (exceptions, preconditions, postconditions)
- Explaining **algorithm choices** or **performance considerations**

**DON'T comment when:**
- The code is self-explanatory
- The comment just repeats the method/parameter name
- The comment restates what the code obviously does
- The comment adds no additional information

## Parameter Documentation

Only document parameters when:
- The parameter has **non-obvious constraints** (e.g., "Must be between 0-100")
- The parameter has **special meaning** (e.g., "Session ID must be unique across all active sessions")
- The parameter has **side effects** (e.g., "Will be mutated in place")
- The parameter type doesn't fully convey its purpose (e.g., `userId: string` might need "Format: UUID v4")

**Avoid:**
- `@param data The data to process` (obvious from name and type)
- `@param userId The user ID` (obvious from name and type)
- `@param callback The callback function` (obvious from name and type)

## Method Documentation

Focus on:
- **Purpose** (what problem it solves)
- **Behavior** (what it does, especially non-obvious parts)
- **Constraints** (preconditions, postconditions, exceptions)
- **Side effects** (mutations, I/O, network calls)
- **Security considerations** (if applicable)

Avoid:
- Restating the method name
- Describing obvious implementation details
- Repeating type information already in the signature
