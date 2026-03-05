/**
 * DeviceCompatibilityGate – Compatibility matrix (min RAM, min OS version per platform) and hardware check.
 * Runs hardware compatibility only on native (ios/android); other platforms skip the check.
 *
 * RAM rationale (InferenceManager: Whisper medium int8 + NER + speaker): ~1 + 0.5 + 0.3 + 1.5 GB headroom → 3.5 GB.
 * Defaults: iOS 3.5 GB / 12.0, Android 3.5 GB / 9.0. 64-bit required; no CPU core check.
 */

import { Platform } from 'react-native';
import { Container } from '@/Container';
import type { LoggerInterface } from '../Service/Logger';
import { HardwareGuard } from './HardwareGuard';

/** Native platforms we run hardware checks for. RN Platform.OS and expo-device (Device.osName) use strings only; no OS enum. */
const NATIVE_OS_VALUES = ['ios', 'android'] as const;
type NativeOs = (typeof NATIVE_OS_VALUES)[number];

const NATIVE_OS: readonly NativeOs[] = [...NATIVE_OS_VALUES];

export type PlatformRequirements = {
    minRamGigabytes: number;
    minSemver: string;
};

export type CompatibilityMatrix = {
    ios: PlatformRequirements;
    android: PlatformRequirements;
};

export const DEFAULT_MATRIX: CompatibilityMatrix = {
    ios: { minRamGigabytes: 3.8, minSemver: '12.0.0' },
    android: { minRamGigabytes: 3.3, minSemver: '9.0.0' },
};

export class DeviceCompatibilityGate {
    // --- public ---

    private activeGuard: HardwareGuard | null = null;

    public constructor(
        private readonly matrix: CompatibilityMatrix = DEFAULT_MATRIX,
        private readonly logger: LoggerInterface,
    ) {}

    // --- private ---

    /** Returns true if not ios/android (skip check), or if the platform guard.isCompatible(). */
    public isCompatible(): boolean {
        const platform = Platform.OS;
        if (!NATIVE_OS.includes(platform as NativeOs)) {
            return true;
        }
        return this.getActiveGuard(platform as NativeOs).isCompatible();
    }

    private getActiveGuard(platform: NativeOs): HardwareGuard {
        if (this.activeGuard == null) {
            const requirements = this.matrix[platform];
            this.activeGuard = new HardwareGuard(this.logger, requirements.minRamGigabytes, requirements.minSemver);
        }
        return this.activeGuard;
    }
}

Container.register(DeviceCompatibilityGate, () => new DeviceCompatibilityGate(DEFAULT_MATRIX, AppLogger.getInstance()));
