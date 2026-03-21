/**
 * QueueItemRepository: Repository<QueueItem> with download‑specific queries.
 * Extends generic Repository to provide methods for filtering download tasks.
 */

import type { Kysely, Transaction } from 'kysely';
import { Container } from '@/Core/Container';
import { Repository } from '@/Database/Repository';
import type { DatabaseSchema } from '@/Database/Type';
import { QueueItem } from '@/Entity/QueueItem';

export class QueueItemRepository extends Repository<QueueItem> {
    public constructor(db?: Kysely<DatabaseSchema> | Transaction<DatabaseSchema>) {
        super(QueueItem, QueueItem.entityName, db);
    }
}

Container.register(QueueItemRepository, () => new QueueItemRepository());
