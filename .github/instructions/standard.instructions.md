---
applyTo: "src/**/*.ts,src/**/*.tsx"
---

# Standards: Architecture & OOP (MVVM / Enterprise)

> Generated code under `src/Api/generated/` is exempt. All wrapper/application code must comply.
> Formatting, naming, imports, and visibility are enforced by **Biome** — see `biome.json`.

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

- **One Class Per File:** Filename must match class name exactly.
  - Constants, enums, interfaces, and module-level exports are ALLOWED in the same file.
  - DO NOT move constants/exports to separate files unless they are themselves classes.
- **No "Utils" / Standalone Functions:** Logic belongs to a class (Service or Entity).
- **Service Naming:** Use capability names (e.g. `VoiceCalibration`), NEVER append `*Service`.
- **Dependency Injection:** Inject via constructor using Interfaces/Types. Never instantiate inside a class.
- **No Object Literals in Classes:** Use a `const INITIAL_STATE` or static factory instead.
- **No standalone `const` object literals as module-level exports.**
  Use `export class X` with `public static readonly` members instead.
  NEVER write `export const Schema = { ... } as const`.
  ALWAYS write `export class Schema { public static readonly ... }`.
- **No "Utils" / Standalone Functions:** Logic belongs to a class.

---

## 3. Member Ordering

> Visibility keywords (`public`, `private`, `protected`) are enforced by Biome (`useConsistentMemberAccessibility`).

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

---

## 6. Naming — Non-Automatable Conventions

> PascalCase for types/classes, camelCase for members, CONSTANT_CASE for global consts, and `TName` for generics are all enforced by Biome.

The following conventions require human judgment:

| Target | Convention | Example |
|--------|-----------|---------|
| Classes, Interfaces, Types | PascalCase | `ConsoleLogger`, `UserRepositoryInterface` |
| Methods, Variables, Params | camelCase | `getUserById`, `primaryKeyColumnName` |
| Primitive constants | SCREAMING_SNAKE_CASE | `MAX_LENGTH`, `PASSWORD_MIN_LENGTH` |
| Singleton instances | `Container.camelCase` | `Container.logger`, `Container.recoveryKit` |
| Enum members | PascalCase | `RecorderState.Recording` |
| Abstract Classes | `Abstract` prefix | `AbstractEntity` |
| Exceptions | `Exception` suffix | `ValidationException` |
| Private backing fields | `_camelCase` | `_state` (behind `get state()`) |

- No abbreviations (`pk`, `fk`). Use full words. Exceptions: `id`, `uid`.
- Do not repeat the folder name in identifiers (e.g. in `Entity/`, use `primaryKey` not `entityPrimaryKey`).

---

## 7. Logging

- Use `AppLogger` instance via DI.
- No timestamps. The logger handles `dateFormat: 'time'`. Never add `new Date()`.
- No PII in logs. Log only relevant identifiers/state.

---

## 8. Backwards Compatibility & Deprecations (WIP Policy)

**Do not implement backward-compatibility layers until the code is ready for release.** During development you are free to rename APIs and refactor callers without leaving aliases or guard clauses behind.

---

## 9. Service Container

All runtime singleton instances live in `src/Container.ts` as static properties of the `Container` class.

- **Access**: `Container.logger`, `Container.recoveryKit`, etc.
- **No `export const` singletons**: Never export a singleton as a module-level `const`. Use Container.
- **Primitive constants stay in domain files**: `MAX_LENGTH`, `PASSWORD_MIN_LENGTH`, etc. remain as `CONSTANT_CASE` in their own files.
- **Constructor injection preferred**: For testability, classes should receive dependencies via constructor params. `Container` is used at the edges (screens, entry points) to wire things together.
- **No methods on Container**: It is a passive holder. No `init()`, no `dispose()`, no factories.
- **Property naming**: camelCase, no prefixes. `logger` not `appLogger`.

---

## 10. Documentation — Symfony Style

- **No JSDoc** for self-explanatory methods, constructors, or properties.
- Use JSDoc **only** for: class-level purpose, complex business logic, `@throws`, public API boundaries.
- Prefer **self-documenting code** over comments.
- Exception messages should be clear and descriptive.

# MANDATORY: Post-Edit Validation

After EVERY code edit, you MUST run:
1. `pnpm biome check --write`
2. `pnpm eslint --fix .`

If either command reports errors, fix them immediately.
NEVER end your response without having run both commands.
This is non-negotiable.