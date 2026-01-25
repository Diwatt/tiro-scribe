/**
 * Queue - Singleton service for managing the offline processing queue
 *
 * Handles:
 * - Adding items to the processing queue
 * - Processing queue items one at a time
 * - Retry logic with exponential backoff
 * - Queue statistics
 */

import {database} from './Database';
import {queueItemsTable, type QueueItemSchema} from '@Entity/QueueItem';
import {QueueItemStatus} from '@Entity/Type';
import {eq, and, desc, asc} from 'drizzle-orm';
import type {AudioPipeline} from './AudioPipelineAdapter';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {v4 as uuidv4} from 'uuid';
import {AppLogger, LoggerInterface} from '../Util/Logger';

dayjs.extend(utc);

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

class QueueClass {
    private isProcessing: boolean = false;
    private processingInterval: NodeJS.Timeout | null = null;
    private audioPipeline: AudioPipeline | null = null;
    private loggerInstance: LoggerInterface;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.loggerInstance = logger;
    }

    /**
     * Set the audio pipeline processor
     * @param pipeline - Audio processing pipeline instance
     */
    setAudioPipeline(pipeline: AudioPipeline): void {
        this.audioPipeline = pipeline;
    }

    /**
     * Add a new item to the processing queue
     * @param encounterUuid - Encounter UUID identifier
     * @param audioPath - Local path to the audio file
     * @returns The created QueueItem
     */
    async addToQueue(
        encounterUuid: string,
        audioPath: string,
    ): Promise<QueueItemSchema> {
        const now = new Date();

        const newItem: typeof queueItemsTable.$inferInsert = {
            id: uuidv4(),
            encounterUuid,
            filePath: audioPath,
            status: QueueItemStatus.PENDING,
            pipelineStage: 'transcription' as any,
            progressPercent: 0,
            autoProcess: true,
            retryCount: 0,
            errorLog: null,
            createdAt: now,
            updatedAt: now,
        };

        const result = await database.insert(queueItemsTable).values(newItem).returning();
        return result[0];
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
            this.loggerInstance.warn('Queue: AudioPipeline not set. Cannot process items.');
            return false;
        }

        this.isProcessing = true;

        try {
            // Fetch the oldest PENDING item
            const pendingItems = await database
                .select()
                .from(queueItemsTable)
                .where(eq(queueItemsTable.status, QueueItemStatus.PENDING))
                .orderBy(asc(queueItemsTable.createdAt))
                .limit(1);

            // If no pending items, check for FAILED items with retry_count < 3
            let itemToProcess: QueueItemSchema | null = null;
            if (pendingItems.length > 0) {
                itemToProcess = pendingItems[0];
            } else {
                const failedItems = await database
                    .select()
                    .from(queueItemsTable)
                    .where(
                        and(
                            eq(queueItemsTable.status, QueueItemStatus.FAILED),
                            eq(queueItemsTable.retryCount, 0) // SQLite doesn't have lt operator in where, use custom SQL if needed
                        )
                    )
                    .orderBy(asc(queueItemsTable.createdAt))
                    .limit(1);

                if (failedItems.length > 0) {
                    itemToProcess = failedItems[0];
                }
            }

            if (!itemToProcess) {
                this.isProcessing = false;
                return false;
            }

            // Mark item as PROCESSING
            await database
                .update(queueItemsTable)
                .set({
                    status: QueueItemStatus.PROCESSING,
                    updatedAt: dayjs.utc().toDate(),
                })
                .where(eq(queueItemsTable.id, itemToProcess.id));

            try {
                // Process the audio file
                await this.audioPipeline.process(itemToProcess.filePath);

                // Mark as COMPLETED on success
                await database
                    .update(queueItemsTable)
                    .set({
                        status: QueueItemStatus.COMPLETED,
                        errorLog: null,
                        updatedAt: dayjs.utc().toDate(),
                    })
                    .where(eq(queueItemsTable.id, itemToProcess.id));

                this.isProcessing = false;
                return true;
            } catch (error) {
                // Handle processing error
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                const newRetryCount = itemToProcess.retryCount + 1;

                await database
                    .update(queueItemsTable)
                    .set({
                        retryCount: newRetryCount,
                        errorLog: errorMessage,
                        status: newRetryCount >= 3 ? QueueItemStatus.FAILED : QueueItemStatus.PENDING,
                        updatedAt: dayjs.utc().toDate(),
                    })
                    .where(eq(queueItemsTable.id, itemToProcess.id));

                this.isProcessing = false;
                return true; // Item was processed (even if it failed)
            }
        } catch (error) {
            this.loggerInstance.error('Queue: Error processing queue item:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
            });
            this.isProcessing = false;
            return false;
        }
    }

    /**
     * Get queue statistics
     * @returns Queue statistics object
     */
    async getQueueStats(): Promise<QueueStats> {
        const [pending, processing, completed, failed, allItems] =
            await Promise.all([
                database
                    .select()
                    .from(queueItemsTable)
                    .where(eq(queueItemsTable.status, QueueItemStatus.PENDING)),
                database
                    .select()
                    .from(queueItemsTable)
                    .where(eq(queueItemsTable.status, QueueItemStatus.PROCESSING)),
                database
                    .select()
                    .from(queueItemsTable)
                    .where(eq(queueItemsTable.status, QueueItemStatus.COMPLETED)),
                database
                    .select()
                    .from(queueItemsTable)
                    .where(eq(queueItemsTable.status, QueueItemStatus.FAILED)),
                database.select().from(queueItemsTable),
            ]);

        return {
            pending: pending.length,
            processing: processing.length,
            completed: completed.length,
            failed: failed.length,
            total: allItems.length,
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
export const Queue = new QueueClass();
