import { execFileSync, spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { HeavyTask } from './HeavyTask.ts';

const AVD_NAME = 'Pixel_7';
const BOOT_TIMEOUT_MS = 300000;
const BOOT_POLL_MS = 2000;

/**
 * Android dev run in three sequential phases so build, emulator and Metro never
 * compete for memory: 1) native build, 2) emulator boot, 3) install + Metro.
 */
class AndroidDev {
    private readonly _adb: string;
    private readonly _emulator: string;
    private readonly _root: string = path.join(import.meta.dirname, '..');

    public constructor() {
        const sdkDirectory = path.join(os.homedir(), 'Library/Android/sdk');
        this._adb = path.join(sdkDirectory, 'platform-tools/adb');
        this._emulator = path.join(sdkDirectory, 'emulator/emulator');
    }

    public async run(): Promise<void> {
        if (this.isEmulatorRunning()) {
            throw new Error('An emulator is already running. Stop it (adb emu kill) before building, or use `pnpm start` for Metro only.');
        }
        await this.build();
        await this.bootEmulator();
        await this.startMetro();
    }

    private async bootEmulator(): Promise<void> {
        await new HeavyTask('android-emulator', 35).run(async () => {
            spawn(this._emulator, ['-avd', AVD_NAME, '-no-snapshot-save', '-noaudio', '-no-boot-anim'], {
                detached: true,
                stdio: 'ignore',
            }).unref();
            HeavyTask.exec(this._adb, ['wait-for-device']);
            await this.waitForBoot();
            return 0;
        });
    }

    private async build(): Promise<void> {
        const status = await new HeavyTask('android-build', 40).run(() =>
            HeavyTask.exec('./gradlew', [':app:assembleDebug', '-PreactNativeArchitectures=arm64-v8a'], {
                cwd: path.join(this._root, 'android'),
            }),
        );
        if (status !== 0) {
            throw new Error(`Android build failed with status ${status}`);
        }
    }

    private isBooted(): boolean {
        try {
            return execFileSync(this._adb, ['shell', 'getprop', 'sys.boot_completed'], { encoding: 'utf8' }).trim() === '1';
        } catch {
            return false;
        }
    }

    private isEmulatorRunning(): boolean {
        try {
            execFileSync('pgrep', ['-f', 'qemu-system-aarch64']);
            return true;
        } catch {
            return false;
        }
    }

    private async startMetro(): Promise<void> {
        const status = await new HeavyTask('android-metro', 30).run(() => HeavyTask.exec('npx', ['expo', 'run:android'], { cwd: this._root }));
        process.exit(status);
    }

    private async waitForBoot(): Promise<void> {
        const startedAt = Date.now();
        while (!this.isBooted()) {
            if (Date.now() - startedAt >= BOOT_TIMEOUT_MS) {
                throw new Error(`Emulator ${AVD_NAME} did not finish booting in ${BOOT_TIMEOUT_MS / 1000}s`);
            }
            await new Promise((resolve) => setTimeout(resolve, BOOT_POLL_MS));
        }
    }
}

new AndroidDev().run().catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
});
