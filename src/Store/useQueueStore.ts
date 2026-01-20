/**
 * Queue Store - OOP class for queue UI state management using Legend-State
 *
 * Provides reactive state for queue statistics and processing status
 */

import {observable, Observable} from '@legendapp/state';
import {Queue, QueueStats} from '@Service';
import {database} from '@Service';
import {queueItemsTable, type QueueItemSchema} from '@Entity/QueueItem';
import {QueueItemStatus} from '@Entity/Type';
import {eq, desc, asc} from 'drizzle-orm';

interface QueueStoreState {
    stats: QueueStats;
    isProcessing: boolean;
}

/**
 * QueueStore - Singleton class for managing queue UI state
 * 
 * Uses Legend-State observables for reactive state management
 * with an OOP interface
 */
class QueueStore {
    private state: Observable<QueueStoreState>;

    constructor() {
        this.state = observable<QueueStoreState>({
            stats: {
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                total: 0,
            },
            isProcessing: false,
        });
    }

    /**
     * Get the observable state for use in React components
     */
    getState(): Observable<QueueStoreState> {
        return this.state;
    }

    /**
     * Get current queue statistics
     */
    getStats(): QueueStats {
        return this.state.stats.get();
    }

    /**
     * Check if queue is processing
     */
    getIsProcessing(): boolean {
        return this.state.isProcessing.get();
    }

    /**
     * Refresh queue statistics from the database
     */
    async refreshStats(): Promise<void> {
        const stats = await Queue.getQueueStats();
        const isProcessing = Queue.isQueueProcessing();
        this.state.stats.set(stats);
        this.state.isProcessing.set(isProcessing);
    }

    /**
     * Start automatic queue processing
     */
    startProcessing(): void {
        Queue.startProcessing();
        this.state.isProcessing.set(true);
    }

    /**
     * Stop automatic queue processing
     */
    stopProcessing(): void {
        Queue.stopProcessing();
        this.state.isProcessing.set(false);
    }

    /**
     * Get all pending queue items
     * @returns Array of pending QueueItem instances
     */
    async getPendingItems(): Promise<QueueItemSchema[]> {
        return await database
            .select()
            .from(queueItemsTable)
            .where(eq(queueItemsTable.status, QueueItemStatus.PENDING))
            .orderBy(asc(queueItemsTable.createdAt));
    }

    /**
     * Get all failed queue items
     * @returns Array of failed QueueItem instances
     */
    async getFailedItems(): Promise<QueueItemSchema[]> {
        return await database
            .select()
            .from(queueItemsTable)
            .where(eq(queueItemsTable.status, QueueItemStatus.FAILED))
            .orderBy(desc(queueItemsTable.createdAt));
    }
}

// Export singleton instance
export const queueStore = new QueueStore();

/**
 * Hook for queue management
 * 
 * Components using this hook should be wrapped with observer() from @legendapp/state/react
 * for proper reactivity, or access state directly
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
export function useQueueStore() {
    const state = queueStore.getState();

    return {
        // State values (access these in components wrapped with observer() for reactivity)
        get stats() {
            return state.stats.get();
        },
        get isProcessing() {
            return state.isProcessing.get();
        },
        // State observable for direct access (use in observer components)
        state: state,
        // Methods
        refreshStats: queueStore.refreshStats.bind(queueStore),
        startProcessing: queueStore.startProcessing.bind(queueStore),
        stopProcessing: queueStore.stopProcessing.bind(queueStore),
        getPendingItems: queueStore.getPendingItems.bind(queueStore),
        getFailedItems: queueStore.getFailedItems.bind(queueStore),
    };
}
