import { DependencyResolutionException } from '@/Exception';

export type ClassType<TInstance = unknown> = abstract new (...args: never[]) => TInstance;

export class Container {
    private static readonly dependencies = new Map<ClassType | symbol, unknown>();
    private static readonly factories = new Map<ClassType | symbol, () => unknown>();

    public static get<T>(key: ClassType<T> | symbol): T {
        if (Container.dependencies.has(key)) {
            return Container.dependencies.get(key) as T;
        }

        const instance = Container.getFactory<T>(key)();
        Container.dependencies.set(key, instance);
        return instance;
    }

    public static register<T>(key: ClassType<T> | symbol, factory: () => T, forceCreation = false): void {
        Container.factories.set(key, factory);
        Container.dependencies.delete(key);

        if (forceCreation) {
            Container.dependencies.set(key, factory());
        }
    }

    private static getFactory<T>(key: ClassType<T> | symbol): () => T {
        const factory = Container.factories.get(key);
        if (!factory) {
            throw new DependencyResolutionException(`No factory registered for ${Container.registrationKeyToString(key)}`);
        }
        return factory as () => T;
    }

    private static registrationKeyToString(key: ClassType | symbol): string {
        return typeof key === 'symbol' ? key.toString() : (key.name || key.toString());
    }
}
