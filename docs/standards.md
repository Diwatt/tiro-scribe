# Coding Standards

## Documentation Rules - Symfony Style

### Philosophy
Following Symfony's documentation approach: **expressive code over extensive documentation**.

### Rules

#### 1. Minimal JSDoc
- **No JSDoc** for methods, constructors, or properties when:
  - Method/parameter names are self-explanatory
  - TypeScript types provide clear information
  - Function behavior is obvious from implementation

#### 2. When to Use JSDoc
Use JSDoc **only** for:
- **Class-level documentation** (single line purpose)
- **Complex business logic** that isn't obvious from code
- **@throws** documentation when exceptions aren't self-explanatory
- **Public API boundaries** where behavior needs clarification

#### 3. Examples

##### ❌ Bad (excessive JSDoc)
```typescript
/**
 * Project a vector using the projection matrix
 * @param vector - Original vector to project
 * @returns Projected vector
 */
public project(vector: number[]): number[] {
```

##### ✅ Good (minimal, self-documenting)
```typescript
public project(vector: number[]): number[] {
```

##### ❌ Bad (unnecessary parameter documentation)
```typescript
/**
 * Calculate cosine similarity between two vectors
 * @param vector1 - First vector
 * @param vector2 - Second vector
 * @returns Cosine similarity score (0-1)
 */
public cosineSimilarity(v1: number[], v2: number[]): number {
```

##### ✅ Good (expressive names + types)
```typescript
public cosineSimilarity(v1: number[], v2: number[]): number {
```

##### ✅ Acceptable (class-level only)
```typescript
/**
 * VectorProjection - Immutable linear algebra operations for voice biocode projection
 */
export class VectorProjection {
```

#### 4. Comments vs JSDoc
- Use **inline comments** for implementation details
- Use **JSDoc** only for API documentation when truly needed
- Prefer **self-documenting code** over comments

#### 5. Exception Handling
- No @throws needed when error messages are self-explanatory
- Exception messages should be clear and descriptive
- Example: `throw new InvalidDimensionError('Projection matrix cannot be empty');`

## Enforcement
- Biome linter configured to not require documentation
- Code reviews should flag unnecessary JSDoc
- Focus on code clarity over documentation volume
