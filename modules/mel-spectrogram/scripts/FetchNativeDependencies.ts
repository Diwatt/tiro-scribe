import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface NativeDependency {
    name: string;
    url: string;
    sha: string;
}

/**
 * Fetches the pinned native DSP dependencies into cpp/vendor/ for the iOS pod
 * (MelSpectrogram.podspec prepare_command — CocoaPods has no CMake). Android
 * fetches natively in android/CMakeLists.txt; both read the same dependency
 * lock: scripts/native-deps.lock. The sources themselves are never committed.
 * Idempotent: skips work when HEAD matches the pin.
 *
 * CLI: pnpm run fetch:native-deps (from modules/mel-spectrogram)
 */
export class FetchNativeDependencies {
    private static readonly LOG_PREFIX = '[fetch-native-deps]';

    private readonly _lockPath: string;
    private readonly _vendorDirectory: string;

    public constructor(rootDirectory: string) {
        this._lockPath = path.join(rootDirectory, 'scripts', 'native-deps.lock');
        this._vendorDirectory = path.join(rootDirectory, 'cpp', 'vendor');
    }

    public run(): void {
        fs.mkdirSync(this._vendorDirectory, { recursive: true });
        for (const dependency of this.readLock()) {
            this.ensureRepository(dependency);
        }
    }

    private readLock(): NativeDependency[] {
        // One "name url sha" line per dependency; '#' comment lines and blanks skipped.
        return fs
            .readFileSync(this._lockPath, 'utf8')
            .split('\n')
            .filter((line) => /^[A-Za-z]/.test(line))
            .map((line) => {
                const [name, url, sha] = line.trim().split(/\s+/);
                if (name === undefined || url === undefined || sha === undefined) {
                    throw new Error(`Malformed dependency line in native-deps.lock: '${line.trim()}'`);
                }
                return { name, url, sha };
            });
    }

    private ensureRepository(dependency: NativeDependency): void {
        const { name, url, sha } = dependency;
        const directory = path.join(this._vendorDirectory, name);

        if (fs.existsSync(path.join(directory, '.git'))) {
            const current = this.git(directory, ['rev-parse', 'HEAD']);
            if (current === sha) {
                console.log(`${FetchNativeDependencies.LOG_PREFIX} ${name} already at ${sha}`);
                return;
            }
            console.log(`${FetchNativeDependencies.LOG_PREFIX} ${name} at ${current} != pinned ${sha}, re-cloning`);
            fs.rmSync(directory, { recursive: true, force: true });
        }

        console.log(`${FetchNativeDependencies.LOG_PREFIX} cloning ${url} at ${sha}`);
        this.git(this._vendorDirectory, ['clone', '--quiet', url, directory]);
        this.git(directory, ['checkout', '--quiet', '--detach', sha]);
        const actual = this.git(directory, ['rev-parse', 'HEAD']);
        if (actual !== sha) {
            throw new Error(`${name} HEAD ${actual} does not match pinned ${sha}`);
        }
        console.log(`${FetchNativeDependencies.LOG_PREFIX} ${name} pinned at ${sha}`);
    }

    private git(workingDirectory: string, args: string[]): string {
        return execFileSync('git', args, { cwd: workingDirectory, encoding: 'utf8' }).trim();
    }
}

if (process.argv[1] === import.meta.filename) {
    new FetchNativeDependencies(path.join(import.meta.dirname, '..')).run();
}
