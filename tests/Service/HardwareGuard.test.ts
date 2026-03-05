/**
 * HardwareGuard and DeviceCompatibilityGate tests. Mocks expo-device to assert
 * isCompatible() behavior; DeviceCompatibilityGate holds the compatibility matrix (iOS/Android mins).
 */

import { DeviceType } from 'expo-device';
import { vi } from 'vitest';
import { HardwareGuardException } from '@/Exception';
import { DeviceCompatibilityGate } from '@/Security/DeviceCompatibilityGate';
import { HardwareGuard } from '@/Security/HardwareGuard';
import { AppLogger } from '@/Service/Logger';

vi.mock('@/Service/Logger', () => {
    const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
    return {
        AppLogger: {
            getInstance: vi.fn(() => mockLogger),
            ...mockLogger,
        },
    };
});

const mockDevice = {
    deviceType: DeviceType.PHONE,
    osVersion: '15.0',
    osName: 'iOS',
    totalMemory: 4 * 1024 ** 3,
    supportedCpuArchitectures: ['arm64'] as string[],
};

vi.mock('react-native', () => ({
    Platform: {
        get OS() {
            return (global as unknown as { __platformOS: 'ios' | 'android' }).__platformOS ?? 'ios';
        },
    },
}));

vi.mock('expo-device', () => ({
    DeviceType: { PHONE: 2, TABLET: 3, DESKTOP: 4, TV: 5 },
    get deviceType() {
        return mockDevice.deviceType;
    },
    get osVersion() {
        return mockDevice.osVersion;
    },
    get osName() {
        return mockDevice.osName;
    },
    get totalMemory() {
        return mockDevice.totalMemory;
    },
    get supportedCpuArchitectures() {
        return mockDevice.supportedCpuArchitectures;
    },
}));

function setPlatform(os: 'ios' | 'android' | 'web') {
    (global as unknown as { __platformOS: 'ios' | 'android' | 'web' }).__platformOS = os;
}

describe('HardwareGuard', () => {
    let guard: HardwareGuard;

    describe('constructor', () => {
        it('succeeds with logger and mins', () => {
            expect(() => new HardwareGuard(AppLogger, 3.8, '12.0.0')).not.toThrow();
        });

        it('throws HardwareGuardException when minVersion is not parseable', () => {
            expect(() => new HardwareGuard(AppLogger, 3.8, '')).toThrow(HardwareGuardException);
            expect(() => new HardwareGuard(AppLogger, 3.8, 'invalid')).toThrow(/minSemver is not parseable/);
        });
    });

    beforeEach(() => {
        setPlatform('ios');
        mockDevice.deviceType = DeviceType.PHONE;
        mockDevice.osVersion = '15.0';
        mockDevice.osName = 'iOS';
        mockDevice.totalMemory = 4 * 1024 ** 3;
        mockDevice.supportedCpuArchitectures = ['arm64'];
    });

    describe('isCompatible', () => {
        it('returns true on iOS when version, RAM and 64-bit are satisfied (iOS matrix)', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.osVersion = '15.0';
            mockDevice.totalMemory = 4 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64'];
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns false on iOS when CPU is 32-bit only', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.supportedCpuArchitectures = ['armv7'];
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns true on iOS when supportedCpuArchitectures includes x86_64 (simulator)', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.supportedCpuArchitectures = ['x86_64'];
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns true on Android when version (>=9.0.0), totalMemory (>=6GB) and 64-bit are satisfied (Android matrix)', () => {
            guard = new HardwareGuard(AppLogger, 6, '9.0.0');
            setPlatform('android');
            mockDevice.osName = 'Android';
            mockDevice.osVersion = '14';
            mockDevice.totalMemory = 6 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64-v8a', 'armeabi-v7a'];
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns false on Android when CPU is 32-bit only', () => {
            guard = new HardwareGuard(AppLogger, 6, '9.0.0');
            setPlatform('android');
            mockDevice.osName = 'Android';
            mockDevice.osVersion = '14';
            mockDevice.totalMemory = 6 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['armeabi-v7a'];
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns false on Android when OS version is below minimum (9.0.0)', () => {
            guard = new HardwareGuard(AppLogger, 6, '9.0.0');
            setPlatform('android');
            mockDevice.osName = 'Android';
            mockDevice.osVersion = '8.0';
            mockDevice.totalMemory = 6 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64-v8a'];
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns false on Android when totalMemory is below minimum (6GB)', () => {
            guard = new HardwareGuard(AppLogger, 6, '9.0.0');
            setPlatform('android');
            mockDevice.osName = 'Android';
            mockDevice.osVersion = '14';
            mockDevice.totalMemory = 4 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64-v8a'];
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns false on iOS when OS version is below minimum (12.0.0)', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.osVersion = '11.0';
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns false on iOS when OS version is empty or unavailable', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.osVersion = '';
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns false on iOS when totalMemory is below minimum (3.8GB)', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.totalMemory = 2 * 1024 ** 3;
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns true on iOS when OS version is exactly at minimum (12.0.0)', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.osVersion = '12.0.0';
            mockDevice.totalMemory = 4 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64'];
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns true on Android when OS version is exactly at minimum (9.0.0)', () => {
            guard = new HardwareGuard(AppLogger, 6, '9.0.0');
            setPlatform('android');
            mockDevice.osName = 'Android';
            mockDevice.osVersion = '9.0.0';
            mockDevice.totalMemory = 6 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64-v8a'];
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns true when deviceType is TABLET (iOS)', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.deviceType = DeviceType.TABLET;
            mockDevice.osVersion = '15.0';
            mockDevice.totalMemory = 4 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64'];
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns true when deviceType is TABLET (Android)', () => {
            guard = new HardwareGuard(AppLogger, 6, '9.0.0');
            setPlatform('android');
            mockDevice.deviceType = DeviceType.TABLET;
            mockDevice.osName = 'Android';
            mockDevice.osVersion = '14';
            mockDevice.totalMemory = 6 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64-v8a'];
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns false when deviceType is DESKTOP', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.deviceType = DeviceType.DESKTOP;
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns false when deviceType is TV', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.deviceType = DeviceType.TV;
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns false on Android when OS version is empty or unavailable', () => {
            guard = new HardwareGuard(AppLogger, 6, '9.0.0');
            setPlatform('android');
            mockDevice.osName = 'Android';
            mockDevice.osVersion = '';
            mockDevice.totalMemory = 6 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64-v8a'];
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns true when supportedCpuArchitectures is empty (no 32-bit-only check)', () => {
            guard = new HardwareGuard(AppLogger, 3.8, '12.0.0');
            setPlatform('ios');
            mockDevice.supportedCpuArchitectures = [];
            mockDevice.osVersion = '15.0';
            mockDevice.totalMemory = 4 * 1024 ** 3;
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns true when custom mins are passed (lower bar)', () => {
            guard = new HardwareGuard(AppLogger, 2, '11.0.0');
            setPlatform('ios');
            mockDevice.osVersion = '11.0';
            mockDevice.totalMemory = 2.5 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64'];
            expect(guard.isCompatible()).toBe(true);
        });

        it('returns false on iOS when version below passed minimum', () => {
            guard = new HardwareGuard(AppLogger, 6, '14.0.0');
            setPlatform('ios');
            mockDevice.osVersion = '13.0';
            mockDevice.totalMemory = 6 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64'];
            expect(guard.isCompatible()).toBe(false);
        });

        it('returns false on Android when version below passed minimum', () => {
            guard = new HardwareGuard(AppLogger, 6, '14.0.0');
            setPlatform('android');
            mockDevice.osName = 'Android';
            mockDevice.osVersion = '13.0';
            mockDevice.totalMemory = 6 * 1024 ** 3;
            mockDevice.supportedCpuArchitectures = ['arm64-v8a'];
            expect(guard.isCompatible()).toBe(false);
        });
    });
});

describe('DeviceCompatibilityGate', () => {
    it('throws HardwareGuardException when ios minSemver is not parseable (on constructor)', () => {
        setPlatform('ios');
        expect(() => {
            guard = new HardwareGuard(AppLogger, 3.8, 'invalid');
        }).toThrow(/minSemver is not parseable/);
    });

    it('throws HardwareGuardException when android minSemver is not parseable (on constructor)', () => {
        setPlatform('android');
        expect(() => {
            guard = new HardwareGuard(AppLogger, 6, 'bad');
        }).toThrow(/minSemver is not parseable/);
    });

    it('succeeds with default matrix', () => {
        expect(() => new DeviceCompatibilityGate(AppLogger)).not.toThrow();
    });
});
