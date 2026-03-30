import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { SystemVerifierException } from '@/Exception';

/**
 * SystemVerifier
 *
 * Evaluates a set of simple constraints expressed as dotted paths into a small
 * set of supported modules (expo-device, expo-file-system via Paths).
 * Each requirement value must begin with one of: >=, <=, ==, !=, >, < followed
 * by a JSON-like literal. Single quoted strings are supported (they are converted
 * to double-quoted for parsing).
 *
 * Example:
 *   { "Device.osName": "==\"Android\"", "Device.totalMemory": ">= 2", "Paths.availableDiskSpace": ">= 1024" }
 */
export class SystemVerifier {
    // Supported modules mapping
    private readonly supportedModules: Record<string, typeof Device | typeof Paths> = {
        // biome-ignore lint/style/useNamingConvention: Device key intentionally uses PascalCase to mirror expo-device API
        Device,
        // biome-ignore lint/style/useNamingConvention: Paths key intentionally uses PascalCase to mirror expo-file-system API
        Paths,
    };

    private readonly operators = ['>=', '<=', '==', '!=', '>', '<'] as const;

    public constructor(private readonly logger: AppLogger) {}

    /**
     * Evaluate whether the provided requirements are supported by the current system context.
     * Returns true when requirements is undefined/empty or when every requirement is satisfied.
     */
    public async isSupported(requirements?: Record<string, string>): Promise<boolean> {
        if (!requirements || Object.keys(requirements).length === 0) {
            return true;
        }

        for (const [path, expr] of Object.entries(requirements)) {
            let actual: unknown;

            try {
                actual = await this.resolveModuleProperty(path);
            } catch (err) {
                // resolution / invocation error -> not supported
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.debug(`[SystemVerifier] ${msg}`);
                return false;
            }

            const operator = this.operators.find((o) => expr.startsWith(o));
            if (!operator) {
                this.logger.debug(`[SystemVerifier] Invalid requirement expression (missing operator): ${expr}`);
                return false;
            }

            const raw = expr.slice(operator.length);
            const expected = this.parseRawValue(raw);

            if (!this.compare(operator, actual, expected)) {
                this.logger.debug(
                    `[SystemVerifier] Requirement failed for ${path}: actual=${String(actual)} operator=${operator} expected=${String(
                        expected,
                    )}`,
                );
                return false;
            }
        }

        return true;
    }

    /**
     * Resolve a Module.Property dotted path against the known supported modules.
     * If the resolved value is a function it will be invoked (with the module bound
     * as `this`) and awaited if it returns a Promise.
     *
     * Throws SystemVerifierException on invalid format, unsupported module, missing property, or invocation failure.
     */
    private async resolveModuleProperty(path: string): Promise<unknown> {
        const parts = path.split('.');

        if (parts.length !== 2) {
            throw SystemVerifierException.invalidPathFormat(path, 'Module.Property');
        }

        const [moduleName, propertyName] = parts;
        const targetModule = this.supportedModules[moduleName as keyof typeof this.supportedModules];
        if (!targetModule) {
            throw SystemVerifierException.unsupportedModule(moduleName);
        }

        const property = Reflect.get(targetModule, propertyName);
        if (property === undefined) {
            throw SystemVerifierException.missingProperty(propertyName, moduleName);
        }

        if (typeof property === 'function') {
            try {
                return await property.call(targetModule);
            } catch (err) {
                const cause = err instanceof Error ? err : new Error(String(err));
                throw SystemVerifierException.methodInvocationFailed(path, cause);
            }
        }

        return property;
    }

    /**
     * Parse the RHS token into a JS value. Supports:
     *  - JSON primitives (via JSON.parse)
     *  - single-quoted strings (converted to double quotes before parsing)
     *  - fallback to trimmed string if parse fails
     */
    private parseRawValue(raw: string): unknown {
        const trimmed = raw.trim();
        // convert single-quoted string to double-quoted for JSON.parse
        const normalized = trimmed.replace(/^'(.*)'$/, '"$1"');
        try {
            return JSON.parse(normalized);
        } catch {
            return trimmed;
        }
    }

    /**
     * Compare actual and expected according to operator.
     * - For equality operators (==, !=) we use strict equality semantics.
     * - For ordering operators, attempt numeric coercion and compare numerically.
     */
    private compare(op: string, actual: unknown, expected: unknown): boolean {
        if (op === '==' || op === '!=') {
            const eq = this.strictEqual(actual, expected);
            return op === '==' ? eq : !eq;
        }

        // ordering ops -> numeric coercion
        const aNum = this.toNumberOrNull(actual);
        const eNum = this.toNumberOrNull(expected);
        if (aNum === null || eNum === null) {
            this.logger.debug(
                `[SystemVerifier] Ordered comparison requires numeric operands. actual=${String(
                    actual,
                )} expected=${String(expected)} op=${op}`,
            );
            return false;
        }

        switch (op) {
            case '>=':
                return aNum >= eNum;
            case '<=':
                return aNum <= eNum;
            case '>':
                return aNum > eNum;
            case '<':
                return aNum < eNum;
            default:
                this.logger.warn(`[SystemVerifier] Unsupported operator: ${op}`);
                return false;
        }
    }

    private toNumberOrNull(v: unknown): number | null {
        if (typeof v === 'number') {
            return v;
        }
        if (typeof v === 'string') {
            const n = Number(v.trim());
            return Number.isFinite(n) ? n : null;
        }
        if (typeof v === 'boolean') {
            return v ? 1 : 0;
        }
        return null;
    }

    private strictEqual(a: unknown, b: unknown): boolean {
        if (a === b) {
            return true;
        }
        if (a && b && typeof a === 'object' && typeof b === 'object') {
            try {
                return JSON.stringify(a) === JSON.stringify(b);
            } catch {
                return false;
            }
        }
        return false;
    }
}

// Register in the DI container
Container.register(SystemVerifier, () => new SystemVerifier(Container.get(AppLogger)));