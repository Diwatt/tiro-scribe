---
description: "Strict OOP TypeScript standards (Symfony/PSR/Enterprise style)"
alwaysApply: true
globs: ["**/*.ts", "**/*.tsx"]
---

# 🛡️ Strict Enterprise TypeScript Guidelines

You act as a senior software architect who enforces strict OOP, SOLID principles, and defensive programming (Symfony/Java Spring style).

## 1. File & Naming Structure
- **One Class/Interface per file**: File name MUST match the export name exactly.
  - See `one-class-per-file.md` for detailed structure guidelines.
- **Naming Conventions**:
  - **Interfaces**: Use descriptive names (`UserInterface`, `RepositoryInterface`). ❌ NO `I` prefix.
  - **Booleans**: Must use verbs (`isValid`, `hasPermission`, `shouldRetry`).
  - **Services**: Must end with `Service` (`AuthService`).
  - **Entities/Models**: Noun only (`Session`, `User`).

## 2. Strict OOP & Visibility (The "PHP" Rule)
- **Visibility** and **code organization** are the source of truth for all class-based rules. Other rules (one-class-per-file, oop-architecture, dependency-injection) assume these are followed.
- **Explicit Visibility**: See `typescript-visibility.md`. ✅ `public readonly id: string;` ✅ `private validate(): void { ... }` ❌ `id: string;`
- **Code Organization**: See `typescript-code-organization.md`. Properties → constructor → methods; within each, public → protected → private.
- **Immutability by Default**: Use `readonly` for properties that shouldn't change after instantiation.
- **No Magic Objects**: Do not use plain objects (`{}`) for complex data. Use **Classes** or **DTOs**.

## 3. Exports & Modules
- **🚫 NO DEFAULT EXPORTS**: Named exports only. See `no-default-exports.md` for details.
  - ✅ `export class UserService { ... }`
  - ❌ `export default class UserService { ... }`

## 4. Typing, Enums & Magic Values
- **No `any`**: Strictly forbidden. Use `unknown` with type guards if necessary.
- **Explicit Return Types**: MANDATORY for all methods/functions.
- **🚫 No Magic Strings/Numbers**: See `avoid-string-literals.md` for complete rules.
  - Use `enum` or `as const` object for fixed values.
  - ✅ `status: SessionStatus.PENDING`
  - ❌ `status: 'PENDING'`

## 5. Dependency Injection & Architecture
- **Constructor Injection**: All dependencies must be injected via constructor. See `dependency-injection.md` for complete pattern.
- **Service vs Data**:
  - **Services** are stateless singletons (contain logic).
  - **Entities** are stateful (contain data + domain methods).
  - ❌ Do not put business logic inside React Components. Extract it to a Service or a Custom Hook.
- **OOP Architecture**: See `oop-architecture.md` for Legend-State observable patterns.

## 6. Error Handling (Exceptions)
- **Throw Custom Exceptions**: Do not throw raw strings or generic errors for domain logic.
- ✅ `throw new SessionNotFoundException(id);`
- ❌ `throw new Error("Session not found");`

## 7. Code Style & Control Flow (Symfony convention)
- **Early Returns**: Avoid `else` keywords where an early return is possible (Guard Clauses).
- **Always use braces for control structures**: No one-line `if`/`for`/`while`/`do` without a block. Same as Symfony/PSR: every branch or loop body must be a block `{ ... }`.
  - ❌ `if (condition) return value;`
  - ✅ `if (condition) { return value; }`
  - ❌ `for (const x of list) doSomething(x);`
  - ✅ `for (const x of list) { doSomething(x); }`
- **Destructuring**: Use object destructuring for method parameters if there are more than 2 arguments.

## 8. Specific for this project (Storage)
- **Rich Models**: When handling data from storage (MMKV/Zod), always hydrate them into Class Instances with methods.
- **No Anemic Models**: Data classes should contain their own logic (`markAsDone()`, `isExpired()`), not just public fields.