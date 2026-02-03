---
description: "Service folder - no 'Service' suffix on class or file names"
alwaysApply: false
globs: ["src/Service/**/*.ts"]
---

# Service Folder Naming

**Rule**: Do not use the `Service` suffix for classes or files in `src/Service/`.

The folder name already indicates the layer; repeating "Service" in the class/file name is redundant.

## Examples

- **Bad**: `TherapistVaultService.ts` / `class TherapistVaultService`
- **Good**: `TherapistVault.ts` / `class TherapistVault`

- **Bad**: `DeviceCompatibilityGateService.ts`
- **Good**: `DeviceCompatibilityGate.ts` (or keep existing name if it has no suffix)

When adding new modules under `src/Service/`, name the class and file after the capability (e.g. `ModelManager`, `VoiceCalibration`, `VaultKeyDerivation`), not `*Service`.
