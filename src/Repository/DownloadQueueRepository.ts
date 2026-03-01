/**
 * DownloadQueueRepository: Repository<DownloadQueue> with download‑specific queries.
 * Extends generic Repository to provide methods for filtering download tasks.
 * Uses Collection class for type-safe collection operations.
 */

import type { Kysely, Transaction } from 'kysely';
import type { Collection } from '@/Database/Collection';
import { Criteria } from '@/Database/Criteria';
import { Repository } from '@/Database/Repository';
import type { DatabaseSchema } from '@/Database/Type';
import { DownloadQueue } from '@/Entity/DownloadQueue';
import { DownloadQueueStatus } from '@/Entity/Type';
import type { QueueStats } from '@/Service/InferenceModelDownload/Type';

export class DownloadQueueRepository extends Repository<DownloadQueue> {
    public constructor(db?: Kysely<DatabaseSchema> | Transaction<DatabaseSchema>) {
        super(DownloadQueue, DownloadQueue.entityName, db);
    }

    /**
     * Find download tasks by capability.
     */
    public async findByCapability(capability: string): Promise<Collection<DownloadQueue>> {
        const criteria = Criteria.of({ capability });
        return this.findBy(criteria);
    }

    /**
     * Find download tasks by capability and language.
     */
    public async findByCapabilityAndLanguage(capability: string, language: string): Promise<Collection<DownloadQueue>> {
        const criteria = Criteria.of({ capability, language });
        return this.findBy(criteria);
    }

    /**
     * Find download tasks by status.
     */
    public async findByStatus(status: DownloadQueueStatus): Promise<Collection<DownloadQueue>> {
        const criteria = Criteria.of({ status });
        return this.findBy(criteria);
    }

    /**
     * Find the oldest pending download task (by createdAt).
     */
    public async findOldestPending(): Promise<DownloadQueue | null> {
        const items = await this.findByStatus(DownloadQueueStatus.Pending);
        if (items.length === 0) {
            return null;
        }
        return items
            .toArray()
            .reduce((oldest, current) => (current.getCreatedAt().isBefore(oldest.getCreatedAt()) ? current : oldest));
    }

    /**
     * Find download tasks that are processable (pending or failed with retries left).
     */
    public async findProcessable(): Promise<DownloadQueue[]> {
        const pending = await this.findByStatus(DownloadQueueStatus.Pending);
        const failed = await this.findByStatus(DownloadQueueStatus.Failed);

        return [...pending, ...failed.filter((item) => item.getNbRetries() < item.getMaxRetries())];
    }

    /**
     * Get statistics for download tasks.
     */
    public async getStats(): Promise<QueueStats> {
        const allItems = await this.findAll();
        const stats: QueueStats = {
            total: 0,
            pending: 0,
            active: 0,
            completed: 0,
            failed: 0,
        };

        for (const item of allItems) {
            stats.total++;
            switch (item.getStatus()) {
                case DownloadQueueStatus.Pending:
                    stats.pending++;
                    break;
                case DownloadQueueStatus.Downloading:
                    stats.active++;
                    break;
                case DownloadQueueStatus.Completed:
                    stats.completed++;
                    break;
                case DownloadQueueStatus.Failed:
                    stats.failed++;
                    break;
                // Paused items are counted as pending for stats
                case DownloadQueueStatus.Paused:
                    stats.pending++;
                    break;
            }
        }

        return stats;
    }

    // Note: These methods return Collection instances.
    // Use findByStatus(), findByCapability() etc. which return Collection,
    // then call .toDataObject() or .toDataObjects() on the Collection as needed.
}
