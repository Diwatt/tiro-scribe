/**
 * Registry: Singleton managing Repository instances (Lazy Loading).
 * Centralized entry point for data access.
 *
 * Usage: const repo = await registry.getRepository(Therapist); repo.find(uuid)
 * Custom repository: @Entity({ repositoryClass: 'TherapistRepository' }) — must be exported from @/Repository.
 */

import { Container } from '@/Core/Container';
import * as RepositoriesModule from '@/Repository';
import type { MetadataConstructor } from '../Decorator/Type';
import { DatabaseException } from '../Exception';
import { EntityMetadata } from './Decorator';
import { Repository } from './Repository';
import type { EntityClass } from './Type';

// constructor signature for any custom repository class; arguments are
// intentionally loose because some repos take parameters (e.g. vault/db).
type RepoCtor = new (...args: unknown[]) => Repository;

const ERROR_CODES = {
    entityNameRequired: 'ENTITY_NAME_REQUIRED',
    repositoryNotExported: 'REPOSITORY_NOT_EXPORTED',
} as const;

export class Registry {
    private readonly repositories = new Map<string, Repository>();

    /**
     * Return a repository for the given entity class.
     *
     * A generic type parameter may be supplied to obtain autocompletion in
     * callers (e.g. `registry.getRepository<TherapistRepository>(Therapist)`),
     * but it is not enforced at runtime.
     */
    // generic parameter is purely for caller autocomplete; no runtime guarantee
    public getRepository<R = Repository>(EntityClass: EntityClass): R {
        const entityName = EntityClass.entityName;
        if (!entityName) {
            throw new DatabaseException(
                `Entity class ${EntityClass.name} must define static entityName`,
                ERROR_CODES.entityNameRequired,
                undefined,
                {
                    entityClass: EntityClass.name,
                },
            );
        }

        const existing = this.repositories.get(entityName);
        if (existing) {
            return existing as unknown as R;
        }

        const meta = EntityMetadata.for(EntityClass as unknown as MetadataConstructor);
        const repositoryClassName = meta.getRepositoryClassName();
        let customClass: RepoCtor | undefined;
        if (repositoryClassName) {
            // Dynamically lookup any repository exported from @/Repository
            const repoClass = (RepositoriesModule as Record<string, unknown>)[repositoryClassName] as
                | RepoCtor
                | undefined;
            if (repoClass == null) {
                throw new DatabaseException(
                    `Custom repository '${repositoryClassName}' is not exported from @/Repository. Add it to src/Repository/index.ts.`,
                    ERROR_CODES.repositoryNotExported,
                    undefined,
                    { repositoryClassName },
                );
            }
            customClass = repoClass;
        }

        const repository = Repository.create(entityName, EntityClass, customClass);
        this.repositories.set(entityName, repository);
        return repository as unknown as R;
    }
}

Container.register(Registry, () => new Registry()); // Register Registry with a factory to ensure it's initialized properly
