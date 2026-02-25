---
applyTo: "src/**/*.ts,src/**/*.tsx"
---

# Standards: Architecture & OOP (MVVM / Enterprise)

> Generated code under `src/Api/generated/` is exempt. All wrapper/application code must comply.

---

## 1. Folder Structure (Domain-Driven)

| Folder | Purpose |
|--------|---------|
| **Api/** | Backend API client, HTTP transport, model resolution, generated types. Import from `@/Api`. |
| **Components/** | Shared UI components (dumb, presentational). |
| **Context/** | React context providers. |
| **Database/** | Persistence: entities, repository, decorators, serialization. |
| **Entity/** | Domain entities (pure data + getters/setters; no I/O). |
| **Exception/** | Custom error types. |
| **Localization/** | Locale, translations, `AppLanguage`, `useAppLanguage`. |
| **Navigation/** | Routing and screen types. |
| **Security/** | Crypto, secure storage, vault, recovery kit, hardware gate. |
| **Service/** | Capabilities (auth, biocode, voice calibration, etc.). No `*Service` suffix. |
| **State/** | ViewModels / observable state. |
| **Screen/** | Screen components (one per route; dumb, render state + bind events). |
| **theme/** | Colors, semantic status. |

- No top-level `utils` or `i18n`. Logic lives in classes; localization in `Localization/`.
- Dependency direction: `Screen → State → Service → Entity → Exception`.
- Never import from a file directly if a domain barrel exists (`@/Service`, `@/Entity`, etc.).

---

## 2. Class Structure (CRITICAL)

- **One Class Per File:** Filename must match class name exactly. No exceptions.
- **No "Utils" / Standalone Functions:** Logic belongs to a class (Service or Entity).
- **Service Naming:** Use capability names (e.g. `VoiceCalibration`), NEVER append `*Service`.
- **Dependency Injection:** Inject via constructor using Interfaces/Types. Never instantiate inside a class.
- **Extends / Implements:** On the same line as the class name.
- **No Object Literals in Classes:** Use a `const INITIAL_STATE` or static factory instead.

---

## 3. Member Visibility & Ordering

Explicit visibility is **MANDATORY** for ALL members in TypeScript, Kotlin, and Swift.

- Use `public`, `private`, `protected`. Never implicit. Never underscore prefixes.
- **Ordering:**
  1. Properties: Static first, then Instance. Within each: `public → protected → private`, then alphabetically.
  2. Constructor / Initializers.
  3. Methods: `public → protected → private`, then alphabetically. Getters/Setters are methods.
- **One property per statement.**

---

## 4. MVVM / Logic Separation

- **Screen (View):** Dumb components. Render `state$` and bind events only. NO business logic.
- **State (ViewModel):** Pure TypeScript classes with `observable` state and methods. No `useState`/`useEffect` for business logic.
- **Service:** Stateless classes handling I/O, API, or complex calculations.

---

## 5. React Component Standards

- Typing: Use `interface Props`. Return `React.JSX.Element`. Avoid `React.FC`.
- Wrap any component reading Legend-State with `observer()`.
- No default exports. Use `export class X` / `export function X` exclusively.

---

## 6. Naming Conventions (PSR / Symfony)

| Target | Convention | Example |
|--------|-----------|---------|
| Classes, Interfaces, Types | PascalCase | `ConsoleLogger`, `UserRepositoryInterface` |
| Methods, Variables, Params | camelCase | `getUserById`, `primaryKeyColumnName` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_LENGTH` |
| Abstract Classes | `Abstract` prefix | `AbstractEntity` |
| Exceptions | `Exception` suffix | `ValidationException` |

- No abbreviations (`pk`, `fk`). Use full words. Exceptions: `id`, `uid`.
- Do not repeat the folder name in identifiers (e.g. in `Entity/`, use `primaryKey` not `entityPrimaryKey`).

---

## 7. Formatting (PSR-12)

- Unix LF line endings. File ends with single newline. No trailing whitespace.
- Soft limit 120 chars. Prefer splitting at 80.
- One statement per line. Spaces for indentation (4).
- One space before/after binary operators. No space before comma, one after.
- Always use braces for `if`/`for`/`while` even for single statements.
- Blank line before final `return` when block has more than one statement.
- Always use parentheses for constructor calls: `new Foo()`.
- Trailing commas in multi-line arrays, argument lists, and object literals.

---

## 8. Strict Coding Style

- No default exports.
- No inline type imports. Use top-level `import type { X } from 'module'`.
- Always ES module syntax (`import x from 'y'`), never `require`.
- No magic strings in conditionals. Use `const` or `enum`.
- Early returns. No `else`/`elseif` after a branch that returns or throws.

---

## 9. Logging

- Use `AppLogger` instance via DI.
- No timestamps. The logger handles `dateFormat: 'time'`. Never add `new Date()`.
- No PII in logs. Log only relevant identifiers/state.
---

## 10. Backwards Compatibility & Deprecations (WIP Policy)

**Do not implement backward‑compatibility layers until the code is ready for
release.** During development you are free to rename APIs and refactor
callers without leaving aliases or guard clauses behind.

- Rename methods and classes as needed; update all references and tests.
- Avoid adding `@deprecated` shims or extra conditionals for future users.
- Compatibility code carries maintenance cost and should only be added when
  a release is imminent or when the package is consumed externally.

Once the module enters a released version, follow semantic versioning and
explicitly deprecate APIs with migration notes.

