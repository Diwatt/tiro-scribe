/**
 * DeviceCompatibilityGate – Compatibility matrix (min RAM, min OS version per platform) and hardware check.
 * Runs hardware compatibility only on native (ios/android); other platforms skip the check.
 *
 * RAM rationale (ModelManager: Whisper medium int8 + NER + speaker): ~1 + 0.5 + 0.3 + 1.5 GB headroom → 3.5 GB.
 * Defaults: iOS 3.5 GB / 12.0, Android 3.5 GB / 9.0. 64-bit required; no CPU core check.
 */

import { Platform } from 'react-native';
import { AppLogger } from '../Service/Logger';
import type { LoggerInterface } from '../Service/Logger';
import { HardwareGuard } from './HardwareGuard';

/** Native platforms we run hardware checks for. RN Platform.OS and expo-device (Device.osName) use strings only; no OS enum. */
const OS = { IOS: 'ios', ANDROID: 'android' } as const;
type NativeOS = (typeof OS)[keyof typeof OS];

const NATIVE_OS: readonly NativeOS[] = [OS.IOS, OS.ANDROID];

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

    public constructor(
        private readonly logger: LoggerInterface,
        private readonly matrix: CompatibilityMatrix = DEFAULT_MATRIX,
    ) {}

    /** Returns true if not ios/android (skip check), or if the platform guard.isCompatible(). */
    public isCompatible(): boolean {
        const platform = Platform.OS;
        if (!NATIVE_OS.includes(platform as NativeOS)) {
            return true;
        }
        return this.getActiveGuard(platform as NativeOS).isCompatible();
    }

    // --- private ---

    private activeGuard: HardwareGuard | null = null;

    private getActiveGuard(platform: NativeOS): HardwareGuard {
        if (this.activeGuard == null) {
            const requirements = this.matrix[platform];
            this.activeGuard = new HardwareGuard(
                this.logger,
                requirements.minRamGigabytes,
                requirements.minSemver,
            );
        }
        return this.activeGuard;
    }
}

export const deviceCompatibilityGate = new DeviceCompatibilityGate(AppLogger.getInstance(), DEFAULT_MATRIX);
