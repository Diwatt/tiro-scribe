/**
 * Queue Store - Zustand store for queue UI state management
 *
 * Provides reactive state for queue statistics and processing status
 */

import {create} from 'zustand';
import {Queue, QueueStats} from '@Service';
import {database} from '@Service';
import {QueueItem} from '@Model/QueueItem';
import {QueueItemStatus} from '@Model/Type';
import {Q} from '@nozbe/watermelondb';

interface QueueStoreState {
    stats: QueueStats;
    isProcessing: boolean;
    refreshStats: () => Promise<void>;
    startProcessing: () => void;
    stopProcessing: () => void;
    getPendingItems: () => Promise<QueueItem[]>;
    getFailedItems: () => Promise<QueueItem[]>;
}

/**
 * Zustand store for queue management
 *
 * @example
 * ```tsx
 * const { stats, refreshStats, startProcessing } = useQueueStore();
 *
 * useEffect(() => {
 *   refreshStats();
 * }, []);
 * ```
 */
export const useQueueStore = create<QueueStoreState>((set, get) => ({
    stats: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
    },
    isProcessing: false,

    /**
     * Refresh queue statistics from the database
     */
    refreshStats: async () => {
        const stats = await Queue.getQueueStats();
        const isProcessing = Queue.isQueueProcessing();
        set({stats, isProcessing});
    },

    /**
     * Start automatic queue processing
     */
    startProcessing: () => {
        Queue.startProcessing();
        set({isProcessing: true});
    },

    /**
     * Stop automatic queue processing
     */
    stopProcessing: () => {
        Queue.stopProcessing();
        set({isProcessing: false});
    },

    /**
     * Get all pending queue items
     * @returns Array of pending QueueItem instances
     */
    getPendingItems: async (): Promise<QueueItem[]> => {
        const queueCollection =
            database.collections.get<QueueItem>('queue_items');
        return await queueCollection
            .query(
                Q.where('status', QueueItemStatus.PENDING),
                Q.sortBy('created_at', Q.asc),
            )
            .fetch();
    },

    /**
     * Get all failed queue items
     * @returns Array of failed QueueItem instances
     */
    getFailedItems: async (): Promise<QueueItem[]> => {
        const queueCollection =
            database.collections.get<QueueItem>('queue_items');
        return await queueCollection
            .query(
                Q.where('status', QueueItemStatus.FAILED),
                Q.sortBy('created_at', Q.desc),
            )
            .fetch();
    },
}));
