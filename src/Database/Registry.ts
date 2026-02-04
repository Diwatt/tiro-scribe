/**
 * Registry: Singleton managing Repository instances (Lazy Loading).
 * Centralized entry point for data access.
 *
 * Usage: registry.getRepository(Therapist).find(uuid)
 * Custom repo (e.g. TherapistRepository) is used at runtime when entity defines repositoryClass.
 *
 * Therapist.repositoryClass is resolved lazily to avoid a require cycle:
 * Therapist -> Registry -> TherapistRepository -> Therapist.
 */

import { TiroScribeException } from '../Exception';
import type { AbstractEntity } from './AbstractEntity';
import { Repository } from './Repository';
import type { EntityClass } from './Type';

const ERROR_CODES = {
    ENTITY_NAME_REQUIRED: 'ENTITY_NAME_REQUIRED',
} as const;

export class Registry {
    private readonly repositories = new Map<string, Repository<AbstractEntity>>();

    public getRepository<
        TEntity extends AbstractEntity,
        TRepository extends Repository<AbstractEntity> = Repository<TEntity>,
    >(EntityClass: EntityClass<TEntity>): TRepository {
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
        if (existing) {
            return existing as TRepository;
        }

        const repository = Repository.create<TEntity>(entityName, EntityClass);
        this.repositories.set(entityName, repository);
        return repository as TRepository;
    }
}

export const registry = new Registry();
