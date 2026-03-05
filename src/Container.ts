// src/Container.ts - Enhanced version with class-based keys

/**
 * Type representing a constructor function that might accept arbitrary arguments.
 */
type ClassType<T = unknown> = new (...args: any[]) => T; // biome-ignore lint: no-explicit-any constructor must accept arbitrary args for compatibility

/**
 * Enhanced Container with class-based keys for better type safety
 *
 * Usage examples:
 * Container.register(AppConfig)                           // No-args constructor
 * Container.register(AppLogger, () => new AppLogger())     // Custom factory
 * Container.register(AppLogger, () => new AppLogger(Container.get(AppConfig))) // With dependencies
 *
 * const appConfig = Container.get(AppConfig)              // Get instance
 * const logger = Container.get(AppLogger)                // Get instance
 */
export class Container {
    private static readonly dependencies = new Map<ClassType | symbol, unknown>();
    private static readonly factories = new Map<ClassType | symbol, () => unknown>();

    public static register<T>(cls: ClassType<T>): void;
    public static register<T>(cls: ClassType<T>, factory: () => T): void;
    public static register<T>(token: symbol, factory: () => T): void;
    public static register<T>(cls: ClassType<T>, factory?: () => T): void;
    public static register<T>(token: ClassType<T> | symbol, factory?: () => T): void {
        if (factory) {
            Container.factories.set(token, factory);
        } else if (typeof token === 'symbol') {
            throw new Error('Symbol tokens require a factory function');
        } else {
            Container.factories.set(token, () => new token());
        }
    }

    public static get<T>(cls: ClassType<T>): T;
    public static get<T>(token: symbol): T;
    public static get<T>(cls: ClassType<T> | symbol): T {
        let instance = Container.dependencies.get(cls) as T;
        if (!instance) {
            const factory = Container.factories.get(cls);
            if (!factory) {
                const tokenName = typeof cls === 'symbol' ? cls.toString() : cls.name;
                throw new Error(`Dependency '${tokenName}' not registered`);
            }
            instance = factory() as T;
            Container.dependencies.set(cls, instance);
        }
        return instance;
    }

    public static getProxy<T extends object>(cls: ClassType<T>): T {
        return new Proxy({} as T, {
            get: (_target, prop) => {
                const instance = Container.get(cls) as any;
                const value = instance[prop];
                return typeof value === 'function' ? value.bind(instance) : value;
            },
        });
    }
}

export type { LoggerInterface } from './Service/Logger';
