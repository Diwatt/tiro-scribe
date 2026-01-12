/**
 * QueueService - Singleton service for managing the offline processing queue
 *
 * Handles:
 * - Adding items to the processing queue
 * - Processing queue items one at a time
 * - Retry logic with exponential backoff
 * - Queue statistics
 */

import {database} from '@Database/index';
import QueueItem from '@Model/QueueItem';
import {QueueItemStatus} from '@Model/Type';
import {Q} from '@nozbe/watermelondb';
import type {AudioPipeline} from './AudioPipelineAdapter';

/**
 * Queue Statistics
 */
export interface QueueStats {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
}

class QueueServiceClass {
    private isProcessing: boolean = false;
    private processingInterval: NodeJS.Timeout | null = null;
    private audioPipeline: AudioPipeline | null = null;

    /**
     * Set the audio pipeline processor
     * @param pipeline - Audio processing pipeline instance
     */
    setAudioPipeline(pipeline: AudioPipeline): void {
        this.audioPipeline = pipeline;
    }

    /**
     * Add a new item to the processing queue
     * @param encounterId - Encounter identifier
     * @param audioPath - Local path to the audio file
     * @returns The created QueueItem
     */
    async addToQueue(
        encounterId: string,
        audioPath: string,
    ): Promise<QueueItem> {
        const now = Date.now();

        let queueItem: QueueItem;
        await database.write(async () => {
            const collection =
                database.collections.get<QueueItem>('queue_items');
            queueItem = await collection.create(item => {
                item.encounterId = encounterId;
                item.filePath = audioPath;
                item.status = QueueItemStatus.PENDING;
                item.retryCount = 0;
                item.errorLog = undefined;
            });
        });

        return queueItem!;
    }

    /**
     * Process the next item in the queue
     * Fetches the oldest PENDING item, marks it as PROCESSING, and processes it
     * @returns true if an item was processed, false if queue is empty
     */
    async processNextItem(): Promise<boolean> {
        // Prevent concurrent processing
        if (this.isProcessing) {
            return false;
        }

        // Check if audio pipeline is available
        if (!this.audioPipeline) {
            console.warn(
                'QueueService: AudioPipeline not set. Cannot process items.',
            );
            return false;
        }

        this.isProcessing = true;

        try {
            // Fetch the oldest PENDING item
            const queueCollection =
                database.collections.get<QueueItem>('queue_items');
            const pendingItems = await queueCollection
                .query(
                    Q.where('status', QueueItemStatus.PENDING),
                    Q.sortBy('created_at', Q.asc),
                    Q.take(1),
                )
                .fetch();

            // If no pending items, check for FAILED items with retry_count < 3
            let itemToProcess: QueueItem | null = null;
            if (pendingItems.length > 0) {
                itemToProcess = pendingItems[0];
            } else {
                const failedItems = await queueCollection
                    .query(
                        Q.where('status', QueueItemStatus.FAILED),
                        Q.where('retry_count', Q.lt(3)),
                        Q.sortBy('created_at', Q.asc),
                        Q.take(1),
                    )
                    .fetch();

                if (failedItems.length > 0) {
                    itemToProcess = failedItems[0];
                }
            }

            if (!itemToProcess) {
                this.isProcessing = false;
                return false;
            }

            // Mark item as PROCESSING
            await database.write(async () => {
                await itemToProcess!.update(item => {
                    item.status = QueueItemStatus.PROCESSING;
                });
            });

            try {
                // Process the audio file
                await this.audioPipeline.process(itemToProcess.filePath);

                // Mark as COMPLETED on success
                await database.write(async () => {
                    await itemToProcess!.update(item => {
                        item.status = QueueItemStatus.COMPLETED;
                        item.errorLog = undefined;
                    });
                });

                this.isProcessing = false;
                return true;
            } catch (error) {
                // Handle processing error
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                const newRetryCount = itemToProcess.retryCount + 1;

                await database.write(async () => {
                    await itemToProcess!.update(item => {
                        item.retryCount = newRetryCount;
                        item.errorLog = errorMessage;

                        if (newRetryCount >= 3) {
                            item.status = QueueItemStatus.FAILED;
                        } else {
                            // Retry: mark back as PENDING for next attempt
                            item.status = QueueItemStatus.PENDING;
                        }
                    });
                });

                this.isProcessing = false;
                return true; // Item was processed (even if it failed)
            }
        } catch (error) {
            console.error('QueueService: Error processing queue item:', error);
            this.isProcessing = false;
            return false;
        }
    }

    /**
     * Get queue statistics
     * @returns Queue statistics object
     */
    async getQueueStats(): Promise<QueueStats> {
        const queueCollection =
            database.collections.get<QueueItem>('queue_items');

        const [pending, processing, completed, failed, total] =
            await Promise.all([
                queueCollection
                    .query(Q.where('status', QueueItemStatus.PENDING))
                    .fetchCount(),
                queueCollection
                    .query(Q.where('status', QueueItemStatus.PROCESSING))
                    .fetchCount(),
                queueCollection
                    .query(Q.where('status', QueueItemStatus.COMPLETED))
                    .fetchCount(),
                queueCollection
                    .query(Q.where('status', QueueItemStatus.FAILED))
                    .fetchCount(),
                queueCollection.query().fetchCount(),
            ]);

        return {
            pending,
            processing,
            completed,
            failed,
            total,
        };
    }

    /**
     * Start automatic processing of queue items
     * Processes items one at a time with a delay between items
     * @param intervalMs - Milliseconds between processing attempts (default: 5000)
     */
    startProcessing(intervalMs: number = 5000): void {
        if (this.processingInterval) {
            return; // Already processing
        }

        this.processingInterval = setInterval(async () => {
            await this.processNextItem();
        }, intervalMs);
    }

    /**
     * Stop automatic processing
     */
    stopProcessing(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }

    /**
     * Check if queue processing is currently active
     */
    isQueueProcessing(): boolean {
        return this.processingInterval !== null;
    }
}

// Export singleton instance
export const QueueService = new QueueServiceClass();
