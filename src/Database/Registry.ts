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
import type { AbstractEntity } from './AbstractEntity';
import { EntityMetadata } from './Decorator';
import { Repository } from './Repository';
import type { EntityClass } from './Type';

const ERROR_CODES = {
    entityNameRequired: 'ENTITY_NAME_REQUIRED',
    repositoryNotExported: 'REPOSITORY_NOT_EXPORTED',
} as const;

export class Registry {
    private readonly repositories = new Map<string, Repository<AbstractEntity>>();

    public async getRepository<TEntity extends AbstractEntity, TRepository extends Repository<AbstractEntity> = Repository<TEntity>>(
        EntityClass: EntityClass<TEntity>,
    ): Promise<TRepository> {
        const entityName = EntityClass.entityName;
        if (!entityName) {
            throw new DatabaseException(`Entity class ${EntityClass.name} must define static entityName`, ERROR_CODES.entityNameRequired, undefined, {
                entityClass: EntityClass.name,
            });
        }

        const existing = this.repositories.get(entityName);
        if (existing) {
            return existing as TRepository;
        }

        const meta = EntityMetadata.for(EntityClass as unknown as MetadataConstructor);
        const repositoryClassName = meta.getRepositoryClassName();
        let customClass: (new () => Repository<AbstractEntity>) | undefined;
        if (repositoryClassName) {
            const RepoClass = (Repositories as Record<string, new () => Repository<AbstractEntity>>)[repositoryClassName];
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

        const repository = Repository.create<TEntity>(entityName, EntityClass, customClass);
        this.repositories.set(entityName, repository);
        return repository as TRepository;
    }
}

export const registry = new Registry();
