/**
 * Security barrel: crypto, recovery, device/hardware gate.
 */

export { CryptoEngine } from './CryptoEngine';
export { DatabaseKeyVault } from './DatabaseKeyVault';
export {
    type CompatibilityMatrix,
    DeviceCompatibilityGate,
    type PlatformRequirements,
} from './DeviceCompatibilityGate';
export { HardwareGuard } from './HardwareGuard';
export { MasterKeyVault } from './MasterKeyVault';
export { RecoveryCode } from './RecoveryCode';
export { RecoveryKit } from './RecoveryKit';
export type { CreateTherapistInput, CreateTherapistResult } from './TherapistForge';
export { TherapistForge } from './TherapistForge';
