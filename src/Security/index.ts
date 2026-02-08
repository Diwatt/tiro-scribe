/**
 * Security barrel: vault, key derivation, device/hardware gate.
 */

export type { CompatibilityMatrix, PlatformRequirements } from './DeviceCompatibilityGate';
export { DeviceCompatibilityGate, deviceCompatibilityGate } from './DeviceCompatibilityGate';
export { HardwareGuard, hardwareGuard } from './HardwareGuard';
export { RecoveryKit } from './RecoveryKit';
export { TherapistVault } from './TherapistVault';
export { VaultKeyDerivation } from './VaultKeyDerivation';
