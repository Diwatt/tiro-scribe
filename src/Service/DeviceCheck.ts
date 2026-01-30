/**
 * DeviceCheck – The Gatekeeper
 * Runs on app launch. Rejects incompatible devices so the app shows "Device Incompatible" and blocks navigation.
 *
 * iOS: Reject if modelId < iPhone13,x (iPhone 12) or RAM < 3.8GB.
 * Android: Reject if RAM < 6GB or low-end CPU (no arm64-v8a).
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { AppLogger } from '../Util/Logger';
import type { LoggerInterface } from '../Util/Logger';

const IOS_MIN_RAM_BYTES = 3.8 * 1024 * 1024 * 1024;
const ANDROID_MIN_RAM_BYTES = 6 * 1024 * 1024 * 1024;
const IOS_MIN_IPHONE_GENERATION = 13;

export class DeviceCheck {
    private static instance: DeviceCheck | null = null;
    private readonly log: LoggerInterface;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.log = logger;
    }

    static getInstance(): DeviceCheck {
        if (DeviceCheck.instance == null) {
            DeviceCheck.instance = new DeviceCheck();
        }
        return DeviceCheck.instance;
    }

    /** Returns true if the device is compatible. If false, show DeviceIncompatibleScreen. */
    async checkCompatible(): Promise<boolean> {
        try {
            if (Platform.OS === 'ios') return this.checkIos();
            if (Platform.OS === 'android') return this.checkAndroid();
            return true;
        } catch (e) {
            this.log.warn('[DeviceCheck] Error during check', {
                error: e,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
            return false;
        }
    }

    private checkIos(): boolean {
        const modelId = Device.modelId ?? null;
        if (modelId) {
            const match = modelId.match(/^iPhone(\d+),/);
            if (match && parseInt(match[1], 10) < IOS_MIN_IPHONE_GENERATION) {
                this.log.warn('[DeviceCheck] iOS device too old', { modelId });
                return false;
            }
        }
        if (Device.totalMemory != null && Device.totalMemory < IOS_MIN_RAM_BYTES) {
            this.log.warn('[DeviceCheck] iOS RAM below 3.8GB', { totalMemory: Device.totalMemory });
            return false;
        }
        return true;
    }

    private checkAndroid(): boolean {
        if (Device.totalMemory != null && Device.totalMemory < ANDROID_MIN_RAM_BYTES) {
            this.log.warn('[DeviceCheck] Android RAM below 6GB', { totalMemory: Device.totalMemory });
            return false;
        }
        const archs = Device.supportedCpuArchitectures ?? [];
        const has64Bit = archs.some(
            (a) => (a?.toLowerCase().includes('arm64') ?? false) || (a?.toLowerCase().includes('x86_64') ?? false),
        );
        if (archs.length > 0 && !has64Bit) {
            this.log.warn('[DeviceCheck] Android low-end CPU (no 64-bit)', { supportedCpuArchitectures: archs });
            return false;
        }
        return true;
    }
}

export const deviceCheck = DeviceCheck.getInstance();
