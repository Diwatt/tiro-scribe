/**
 * Registry: Singleton managing Repository instances (Lazy Loading).
 * Centralized entry point for data access.
 *
 * Usage: registry.getRepository(Therapist).find(uuid)
 */

import { TiroScribeException } from '../Exception';
import type { AbstractEntity, EntityConstructor } from './AbstractEntity';
import { Repository, type RecordWithUuid } from './Repository';

const ERROR_CODES = {
    ENTITY_NAME_REQUIRED: 'ENTITY_NAME_REQUIRED',
} as const;

export class Registry {
    private readonly repositories = new Map<string, Repository<AbstractEntity>>();

    public getRepository<TEntity extends AbstractEntity>(
        EntityClass: EntityConstructor<TEntity>,
    ): Repository<TEntity> {
        const entityName = EntityClass.entityName;
        if (!entityName) {
            throw new TiroScribeException(
                `Entity class ${EntityClass.name} must define static entityName`,
                ERROR_CODES.ENTITY_NAME_REQUIRED,
                undefined,
                { entityClass: EntityClass.name },
            );
        }

        const existing = this.repositories.get(entityName);
        if (existing) return existing as Repository<TEntity>;

        const repository = new Repository<TEntity>(
            EntityClass as EntityConstructor<TEntity>,
            entityName,
        );
        this.repositories.set(entityName, repository as Repository<AbstractEntity>);
        return repository;
    }

    public clear(): void {
        this.repositories.clear();
    }
}

export const registry = new Registry();
