/**
 * HardwareGuard – Gatekeeper for hardware requirements.
 * Runs on app launch. Rejects incompatible devices so the app shows "Device Incompatible" and blocks navigation.
 *
 * Handles one single device: minRamGigabytes and minVersion are set in the constructor; isCompatible() checks
 * the current device against those mins. DeviceCompatibilityGate holds the matrix and creates one guard per platform.
 *
 * Device.osVersion (semver), Device.totalMemory, Device.deviceType (PHONE/TABLET), Device.supportedCpuArchitectures (64-bit).
 * RAM: Device.totalMemory so the gate is stable across restarts and battery saver.
 * Uses expo-device: osName, osVersion, totalMemory, supportedCpuArchitectures, deviceType.
 */

import * as Device from 'expo-device';
import { DeviceType } from 'expo-device';
import semver from 'semver';
import type { AppLogger } from '@/Core/AppLogger';
import { HardwareGuardException } from '../Exception';

export class HardwareGuard {
    // --- public ---

    private readonly minRamBytes: number;

    private readonly minSemverCoerced: semver.SemVer;

    // --- private ---

    public constructor(
        private readonly logger: AppLogger,
        minRamGigabytes: number,
        minVersion: string,
    ) {
        this.minRamBytes = minRamGigabytes * 1024 ** 3;
        this.minSemverCoerced = this.validateVersion(minVersion);
    }
    /** Returns true if current device meets the constructor mins. */
    public isCompatible(): boolean {
        if (!this.isPhoneOrTablet()) {
            return false;
        }
        if (!this.is64Bit()) {
            return false;
        }
        const platformLabel = Device.osName ?? 'device';
        return (
            this.hasMinOsVersion(Device.osVersion, this.minSemverCoerced, platformLabel) &&
            this.hasEnoughRam(this.minRamBytes)
        );
    }

    /** True if Device.totalMemory >= minRamBytes. */
    private hasEnoughRam(minRamBytes: number): boolean {
        const total = Device.totalMemory;
        if (total != null && total < minRamBytes) {
            this.logger.warn('[HardwareGuard] RAM below threshold', { totalMemory: total });
            return false;
        }
        return true;
    }

    /** True if osVersion (semver) >= coercedMin. */
    private hasMinOsVersion(
        osVersion: string | null | undefined,
        coercedMin: semver.SemVer,
        platformLabel: string,
    ): boolean {
        const actual = (osVersion ?? '').trim();
        const isParseableActual = !!semver.coerce(actual);
        if (!actual || !isParseableActual) {
            this.logger.warn(`[HardwareGuard] ${platformLabel} OS version unavailable or unparseable`, {
                osName: Device.osName,
                osVersion: osVersion ?? null,
            });
            return false;
        }
        const coercedActual = semver.coerce(actual);
        if (!coercedActual) {
            this.logger.warn(`[HardwareGuard] ${platformLabel} OS version unavailable or unparseable`, {
                osName: Device.osName,
                osVersion: osVersion ?? null,
            });
            return false;
        }
        if (!semver.gte(coercedActual, coercedMin)) {
            this.logger.warn(`[HardwareGuard] ${platformLabel} OS below minimum version`, {
                osName: Device.osName,
                osVersion: actual,
                required: coercedMin.version,
            });
            return false;
        }
        return true;
    }

    /** True if Device.supportedCpuArchitectures includes 64-bit (arm64 / x86_64). */
    private is64Bit(): boolean {
        const archs = Device.supportedCpuArchitectures ?? [];
        const has = archs.some(
            (a) => (a?.toLowerCase().includes('arm64') ?? false) || (a?.toLowerCase().includes('x86_64') ?? false),
        );
        if (archs.length > 0 && !has) {
            this.logger.warn('[HardwareGuard] No 64-bit CPU (arm64/x86_64)', { supportedCpuArchitectures: archs });
            return false;
        }
        return true;
    }

    /** True if Device.deviceType is PHONE or TABLET. */
    private isPhoneOrTablet(): boolean {
        const type = Device.deviceType;
        if (type != null && type !== DeviceType.PHONE && type !== DeviceType.TABLET) {
            this.logger.warn('[HardwareGuard] Device type not supported', { deviceType: type });
            return false;
        }
        return true;
    }

    private validateVersion(minVersion: string): semver.SemVer {
        if (!minVersion || typeof minVersion !== 'string') {
            throw new HardwareGuardException(
                `minSemver is not a valid string: "${minVersion}"`,
                HardwareGuardException.invalidMinVersion,
                undefined,
                {
                    minSemver: minVersion,
                },
            );
        }

        const coerced = semver.coerce(minVersion.trim());
        if (!coerced) {
            this.logger.error('[HardwareGuard] Failed to parse minVersion', {
                minVersion,
            });
            throw new HardwareGuardException(
                `minSemver is not parseable: "${minVersion}"`,
                HardwareGuardException.invalidMinVersion,
                undefined,
                {
                    minSemver: minVersion,
                },
            );
        }
        return coerced;
    }
}
