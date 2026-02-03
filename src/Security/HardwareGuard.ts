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
import { HardwareGuardException } from '../Exception';
import { AppLogger } from '../Service/Logger';
import type { LoggerInterface } from '../Service/Logger';

export class HardwareGuard {
    // --- public ---

    public constructor(
        private readonly log: LoggerInterface,
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

    // --- private ---

    private readonly minRamBytes: number;
    private readonly minSemverCoerced: semver.SemVer;

    private validateVersion(minVersion: string): semver.SemVer {
        const coerced = semver.coerce(minVersion.trim());
        if (!coerced) {
            throw new HardwareGuardException(
                `minSemver is not parseable: "${minVersion}"`,
                HardwareGuardException.INVALID_MIN_VERSION,
                undefined,
                { minSemver: minVersion },
            );
        }
        return coerced;
    }

    /** True if Device.deviceType is PHONE or TABLET. */
    private isPhoneOrTablet(): boolean {
        const type = Device.deviceType;
        if (type != null && type !== DeviceType.PHONE && type !== DeviceType.TABLET) {
            this.log.warn('[HardwareGuard] Device type not supported', { deviceType: type });
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
            this.log.warn(`[HardwareGuard] ${platformLabel} OS version unavailable or unparseable`, {
                osName: Device.osName,
                osVersion: osVersion ?? null,
            });
            return false;
        }
        const coercedActual = semver.coerce(actual)!;
        if (!semver.gte(coercedActual, coercedMin)) {
            this.log.warn(`[HardwareGuard] ${platformLabel} OS below minimum version`, {
                osName: Device.osName,
                osVersion: actual,
                required: coercedMin.version,
            });
            return false;
        }
        return true;
    }

    /** True if Device.totalMemory >= minRamBytes. */
    private hasEnoughRam(minRamBytes: number): boolean {
        const total = Device.totalMemory;
        if (total != null && total < minRamBytes) {
            this.log.warn('[HardwareGuard] RAM below threshold', { totalMemory: total });
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
            this.log.warn('[HardwareGuard] No 64-bit CPU (arm64/x86_64)', { supportedCpuArchitectures: archs });
            return false;
        }
        return true;
    }
}

export const hardwareGuard = new HardwareGuard(AppLogger.getInstance(), 3.8, '12.0.0');
