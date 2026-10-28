import { EntityRepository } from '@mikro-orm/core';

/** Base repository: keeps the app-wide `persist` (upsert) and `exists` contract. */
export abstract class AbstractRepository<TEntity extends object> extends EntityRepository<TEntity> {
    public async persist(entity: TEntity): Promise<TEntity> {
        return this.getEntityManager().upsert(entity);
    }

    public async delete(entity: TEntity): Promise<void> {
        const em = this.getEntityManager();
        em.remove(entity);
        await em.flush();
    }

    public async exists(primaryKey: string): Promise<boolean> {
        return (await this.findOne(primaryKey as never)) != null;
    }
}
