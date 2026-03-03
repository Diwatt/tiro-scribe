/**
 * Security barrel: crypto, recovery, device/hardware gate.
 */

export { CryptoEngine } from './CryptoEngine';
export {
    type CompatibilityMatrix,
    DeviceCompatibilityGate,
    type PlatformRequirements,
} from './DeviceCompatibilityGate';
export { HardwareGuard } from './HardwareGuard';
export { MasterKeyVault, type MasterKeyVaultInterface } from './MasterKeyVault';
export { RecoveryCode } from './RecoveryCode';
export { RecoveryKit } from './RecoveryKit';
export type { CreateTherapistInput, CreateTherapistResult } from './TherapistForge';
export { TherapistForge } from './TherapistForge';
