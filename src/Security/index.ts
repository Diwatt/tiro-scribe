/**
 * Security barrel: vault, key derivation, device/hardware gate.
 */

export { HardwareGuard, hardwareGuard } from './HardwareGuard';
export { DeviceCompatibilityGate, deviceCompatibilityGate } from './DeviceCompatibilityGate';
export type { PlatformRequirements, CompatibilityMatrix } from './DeviceCompatibilityGate';
export { TherapistVault } from './TherapistVault';
export { VaultKeyDerivation } from './VaultKeyDerivation';
