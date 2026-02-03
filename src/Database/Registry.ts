/**
 * Registry: Singleton managing Repository instances (Lazy Loading).
 * Centralized entry point for data access.
 *
 * Usage: registry.getRepository(Therapist).find(uuid)
 * TherapistRepository: registry.getRepository(Therapist).hasActiveSession()
 */

import { TiroScribeException } from '../Exception';
import type { AbstractEntity, EntityConstructorInput } from './AbstractEntity';
import { Repository } from './Repository';
import { Therapist } from '../Entity/Therapist';
import { TherapistRepository } from './TherapistRepository';

const ERROR_CODES = {
    ENTITY_NAME_REQUIRED: 'ENTITY_NAME_REQUIRED',
} as const;

export class Registry {
    private readonly repositories = new Map<string, Repository<AbstractEntity>>();

    public getRepository(therapist: typeof Therapist): TherapistRepository;
    public getRepository<TEntity extends AbstractEntity>(
        EntityClass: {
            new (dataOrObservable?: EntityConstructorInput): TEntity;
            entityName: string;
        },
    ): Repository<TEntity>;
    public getRepository<TEntity extends AbstractEntity>(
        EntityClass: {
            new (dataOrObservable?: EntityConstructorInput): TEntity;
            entityName: string;
        },
    ): Repository<TEntity> | TherapistRepository {
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
        if (existing) return existing as Repository<TEntity> | TherapistRepository;

        const repository =
            (EntityClass as unknown) === Therapist
                ? new TherapistRepository()
                : new Repository<TEntity>(EntityClass, entityName);
        this.repositories.set(entityName, repository as Repository<AbstractEntity>);
        return repository as Repository<TEntity> | TherapistRepository;
    }
}

export const registry = new Registry();
