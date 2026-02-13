/**
 * Security barrel: crypto, recovery, device/hardware gate.
 */

export { CryptoEngine } from './CryptoEngine';
export type { CompatibilityMatrix, PlatformRequirements } from './DeviceCompatibilityGate';
export { DeviceCompatibilityGate, deviceCompatibilityGate } from './DeviceCompatibilityGate';
export { HardwareGuard, hardwareGuard } from './HardwareGuard';
export { MasterKeyVault, masterKeyVault, type MasterKeyVaultInterface } from './MasterKeyVault';
export { RecoveryCode } from './RecoveryCode';
export { RecoveryKit } from './RecoveryKit';
