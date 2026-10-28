import { DownloadQueue } from '@/Entity/DownloadQueue';
import { DownloadQueueStatus } from '@/Entity/Type';
import type { QueueStats } from '@/InferenceModel/Download/Type';
import { AbstractRepository } from './AbstractRepository';

export class DownloadQueueRepository extends AbstractRepository<DownloadQueue> {
    public async findByCapability(capability: string): Promise<DownloadQueue[]> {
        return this.find({ capability });
    }

    public async findByCapabilityAndLanguage(capability: string, language: string): Promise<DownloadQueue[]> {
        return this.find({ capability, language });
    }

    public async findByStatus(status: DownloadQueueStatus): Promise<DownloadQueue[]> {
        return this.find({ status });
    }

    public async findOldestPending(): Promise<DownloadQueue | null> {
        const items = await this.findByStatus(DownloadQueueStatus.Pending);
        if (items.length === 0) {
            return null;
        }

        return items.reduce((oldest, current) =>
            current.getCreatedAt().isBefore(oldest.getCreatedAt()) ? current : oldest,
        );
    }

    public async findProcessable(): Promise<DownloadQueue[]> {
        const pending = await this.findByStatus(DownloadQueueStatus.Pending);
        const failed = await this.findByStatus(DownloadQueueStatus.Failed);

        return [...pending, ...failed.filter((item) => item.getNbRetries() < item.getMaxRetries())];
    }

    public async getStats(): Promise<QueueStats> {
        const allItems = await this.findAll();
        const stats: QueueStats = { total: 0, pending: 0, active: 0, completed: 0, failed: 0 };
        for (const item of allItems) {
            stats.total++;
            if (item.getStatus() === DownloadQueueStatus.Pending || item.getStatus() === DownloadQueueStatus.Paused) {
                stats.pending++;
            }
            if (item.getStatus() === DownloadQueueStatus.Downloading) {
                stats.active++;
            }
            if (item.getStatus() === DownloadQueueStatus.Completed) {
                stats.completed++;
            }
            if (item.getStatus() === DownloadQueueStatus.Failed) {
                stats.failed++;
            }
        }

        return stats;
    }
}
