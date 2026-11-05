import { execFileSync, spawnSync, type SpawnSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_WAIT_MS = 600000;
const POLL_MS = 5000;
const TOP_CONSUMERS_COUNT = 5;

/**
 * Runs one memory-heavy task (native build, emulator boot, ASR fixtures) at a
 * time, and only when the Mac has enough free memory.
 *
 * CLI: node scripts/HeavyTask.ts <name> <minFreePercent> <command...>
 */
export class HeavyTask {
    private readonly _lockDirectory: string = path.join(os.tmpdir(), 'tiro-heavy.lock');
    private readonly _minFreePercent: number;
    private readonly _name: string;

    public constructor(name: string, minFreePercent: number) {
        this._name = name;
        this._minFreePercent = minFreePercent;
    }

    public static exec(command: string, args: string[], options: SpawnSyncOptions = {}): number {
        return spawnSync(command, args, { stdio: 'inherit', ...options }).status ?? 1;
    }

    private static sleep(milliseconds: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }

    public async run(work: () => Promise<number> | number): Promise<number> {
        await this.acquireLock();
        try {
            await this.waitForMemory();
            console.log(`[heavy] '${this._name}' starts (${this.freePercent()}% free)`);
            return await work();
        } finally {
            fs.rmSync(this._lockDirectory, { recursive: true, force: true });
        }
    }

    private async acquireLock(): Promise<void> {
        const startedAt = Date.now();
        while (!this.tryLock()) {
            if (Date.now() - startedAt >= MAX_WAIT_MS) {
                throw new Error(`[heavy] gave up waiting for '${this.lockOwnerName()}'`);
            }
            console.log(`[heavy] '${this.lockOwnerName()}' is running, '${this._name}' waits...`);
            await HeavyTask.sleep(POLL_MS);
        }
    }

    private freePercent(): number {
        const output = execFileSync('memory_pressure', { encoding: 'utf8' });
        const match = /free percentage:\s*(\d+)%/.exec(output);
        if (!match) {
            throw new Error('[heavy] could not read free memory percentage from memory_pressure');
        }
        return Number(match[1]);
    }

    private isLockOwnerAlive(): boolean {
        try {
            process.kill(Number(fs.readFileSync(path.join(this._lockDirectory, 'pid'), 'utf8')), 0);
            return true;
        } catch {
            return false;
        }
    }

    private lockOwnerName(): string {
        try {
            return fs.readFileSync(path.join(this._lockDirectory, 'name'), 'utf8');
        } catch {
            return 'unknown';
        }
    }

    private topConsumers(): string {
        return execFileSync('ps', ['-Ao', 'rss=,comm=', '-m'], { encoding: 'utf8' })
            .split('\n')
            .slice(0, TOP_CONSUMERS_COUNT)
            .map((line) => {
                const [rss, ...name] = line.trim().split(/\s+/);
                return `  ${Math.round(Number(rss) / 1024)} MB  ${name.join(' ')}`;
            })
            .join('\n');
    }

    private tryLock(): boolean {
        try {
            fs.mkdirSync(this._lockDirectory);
        } catch {
            if (this.isLockOwnerAlive()) {
                return false;
            }
            fs.rmSync(this._lockDirectory, { recursive: true, force: true });
            return this.tryLock();
        }
        fs.writeFileSync(path.join(this._lockDirectory, 'pid'), String(process.pid));
        fs.writeFileSync(path.join(this._lockDirectory, 'name'), this._name);
        return true;
    }

    private async waitForMemory(): Promise<void> {
        const startedAt = Date.now();
        while (this.freePercent() < this._minFreePercent) {
            if (Date.now() - startedAt >= MAX_WAIT_MS) {
                throw new Error(
                    `[heavy] '${this._name}' aborted: ${this.freePercent()}% free < ${this._minFreePercent}%. Top consumers:\n${this.topConsumers()}`,
                );
            }
            console.log(`[heavy] '${this._name}' waits for memory: ${this.freePercent()}% free, needs ${this._minFreePercent}%`);
            await HeavyTask.sleep(POLL_MS);
        }
    }
}

if (process.argv[1] === import.meta.filename) {
    const [name, minFreePercent, command, ...args] = process.argv.slice(2);
    if (!name || !minFreePercent || !command) {
        console.error('Usage: node scripts/HeavyTask.ts <name> <minFreePercent> <command...>');
        process.exit(2);
    }
    new HeavyTask(name, Number(minFreePercent))
        .run(() => HeavyTask.exec(command, args))
        .then((status) => process.exit(status))
        .catch((error: Error) => {
            console.error(error.message);
            process.exit(1);
        });
}
