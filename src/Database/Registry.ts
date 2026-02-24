/**
 * Registry: Singleton managing Repository instances (Lazy Loading).
 * Centralized entry point for data access.
 *
 * Usage: const repo = await registry.getRepository(Therapist); repo.find(uuid)
 * Custom repository: @Entity({ repositoryClass: 'TherapistRepository' }) — must be exported from @/Repository.
 */

import * as Repositories from '@/Repository';
import type { MetadataConstructor } from '../Decorator/Type';
import { DatabaseException } from '../Exception';
import { EntityMetadata } from './Decorator';
import { Repository } from './Repository';
import type { EntityClass } from './Type';

// constructor signature for any custom repository class; arguments are
// intentionally loose because some repos take parameters (e.g. vault/db).
type RepoCtor = new (...args: unknown[]) => Repository;

// we cast the auto-generated `Repositories` object to this shape once below
// so that the lookup code is clean and readable.

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
     * callers (e.g. `await registry.getRepository<TherapistRepository>(Therapist)`),
     * but it is not enforced at runtime.
     */
    // generic parameter is purely for caller autocomplete; no runtime guarantee
    public async getRepository<R = Repository>(EntityClass: EntityClass): Promise<R> {
        const entityName = EntityClass.entityName;
        if (!entityName) {
            throw new DatabaseException(`Entity class ${EntityClass.name} must define static entityName`, ERROR_CODES.entityNameRequired, undefined, {
                entityClass: EntityClass.name,
            });
        }

        const existing = this.repositories.get(entityName);
        if (existing) {
            return existing as unknown as R;
        }

        const meta = EntityMetadata.for(EntityClass as unknown as MetadataConstructor);
        const repositoryClassName = meta.getRepositoryClassName();
        let customClass: RepoCtor | undefined;
        if (repositoryClassName) {
            // perform a typed lookup on the Repositories export object – we
            // alias it via RepoCtor above so that we don't have to repeat the
            // cast at the call site or resort to `any`.
            const repoLookup = Repositories as unknown as Record<string, RepoCtor>;
            const RepoClass = repoLookup[repositoryClassName];
            if (RepoClass == null) {
                throw new DatabaseException(
                    `Custom repository '${repositoryClassName}' is not exported from @/Repository. Add it to src/Repository/index.ts.`,
                    ERROR_CODES.repositoryNotExported,
                    undefined,
                    { repositoryClassName },
                );
            }
            customClass = RepoClass;
        }

        const repository = Repository.create(entityName, EntityClass, customClass);
        this.repositories.set(entityName, repository);
        return repository as unknown as R;
    }
}

export const registry = new Registry();
