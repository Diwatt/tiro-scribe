/**
 * DeviceCompatibilityGate – Compatibility matrix (min RAM, min OS version per platform) and hardware check.
 * Runs hardware compatibility only on native (ios/android); other platforms skip the check.
 *
 * Compatibility matrix (defaults):
 * - iOS: minRamGigabytes 3.8, minSemver 12.0.0
 * - Android: minRamGigabytes 6, minSemver 9.0.0
 */

import { Platform } from 'react-native';
import { AppLogger } from '../Service/Logger';
import type { LoggerInterface } from '../Service/Logger';
import { HardwareGuard } from './HardwareGuard';

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
    android: { minRamGigabytes: 6, minSemver: '9.0.0' },
};

export class DeviceCompatibilityGate {
    // --- public ---

    public constructor(
        log: LoggerInterface,
        matrix: CompatibilityMatrix = DEFAULT_MATRIX,
    ) {
        this.iosGuard = new HardwareGuard(log, matrix.ios.minRamGigabytes, matrix.ios.minSemver);
        this.androidGuard = new HardwareGuard(log, matrix.android.minRamGigabytes, matrix.android.minSemver);
    }

    /** Returns true if not ios/android (skip check), or if the platform guard.isCompatible(). */
    public isCompatible(): boolean {
        const platform = Platform.OS;
        if (platform !== 'ios' && platform !== 'android') {
            return true;
        }
        if (platform === 'ios') {
            return this.iosGuard.isCompatible();
        }
        return this.androidGuard.isCompatible();
    }

    // --- private ---

    private readonly iosGuard: HardwareGuard;
    private readonly androidGuard: HardwareGuard;
}

export const deviceCompatibilityGate = new DeviceCompatibilityGate(AppLogger.getInstance(), DEFAULT_MATRIX);
