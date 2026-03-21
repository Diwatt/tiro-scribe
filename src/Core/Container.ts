import { AppConfig } from '@/Core/AppConfig';
import { AppLogger } from '@/Core/AppLogger';
import { GlobalActivityStatus } from '@/State/GlobalActivityStatus';

// Enhanced version with class-based keys

/**
 * Type representing a constructor function that might accept arbitrary arguments.
 */

// biome-ignore lint/suspicious/noExplicitAny: <this is necessary for a flexible factory function>
export type ClassType<T = unknown> = new (...args: any[]) => T;

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

    /**
     * Initializes the container by preloading essential dependencies.
     */
    public static initialize(): void {
        // Register AppConfig using its singleton instance
        Container.register(AppConfig, () => AppConfig.getInstance(), true);

        // Ensure AppLogger is initialized with its dependency
        const config = Container.get(AppConfig);
        Container.register(AppLogger, () => new AppLogger(config), true);

        // Register GlobalActivityStatus
        Container.register(GlobalActivityStatus, () => new GlobalActivityStatus(), true);
    }

    public static register<T>(cls: ClassType<T>, factory: () => T, forceCreation = false): void {
        Container.factories.set(cls, factory);

        if (forceCreation) {
            Container.dependencies.set(cls, factory());
        }
    }

    public static get<T>(cls: ClassType<T>): T {
        let instance = Container.dependencies.get(cls) as T;
        if (!instance) {
            const Factory = Container.factories.get(cls);
            if (!Factory) {
                throw new Error(`No factory registered for ${cls.toString()}`);
            }
            instance = Factory() as T;
            Container.dependencies.set(cls, instance);
        }
        return instance;
    }
}
