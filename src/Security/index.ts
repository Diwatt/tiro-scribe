/**
 * Security barrel: crypto, recovery, device/hardware gate.
 */

export { CryptoEngine } from './CryptoEngine';
export type { CompatibilityMatrix, PlatformRequirements } from './DeviceCompatibilityGate';
export { DeviceCompatibilityGate, deviceCompatibilityGate } from './DeviceCompatibilityGate';
export { HardwareGuard, hardwareGuard } from './HardwareGuard';
export { MasterKeyVault, type MasterKeyVaultInterface, masterKeyVault } from './MasterKeyVault';
export { RecoveryCode } from './RecoveryCode';
export { RecoveryKit } from './RecoveryKit';
export type { CreateTherapistInput, CreateTherapistResult } from './TherapistForge';
export { TherapistForge } from './TherapistForge';
