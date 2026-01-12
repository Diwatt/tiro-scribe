/**
 * QueueItem Model
 * WatermelonDB model for processing queue items
 * Contains both the model class and its schema definition
 */

import {Model} from '@nozbe/watermelondb';
import {field, date} from '@nozbe/watermelondb/decorators';
import {tableSchema} from '@nozbe/watermelondb';
import {QueueItemStatus} from './Type';

/**
 * QueueItem table schema definition
 * Exported as static property for WatermelonDB registration
 */
export const QueueItemSchema = tableSchema({
    name: 'queue_items',
    columns: [
        {name: 'encounter_id', type: 'string', isIndexed: true},
        {name: 'file_path', type: 'string'},
        {name: 'status', type: 'string', isIndexed: true}, // 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
        {name: 'retry_count', type: 'number'},
        {name: 'error_log', type: 'string', isOptional: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
    ],
});

/**
 * QueueItem Model Class
 * WatermelonDB model for processing queue items
 */
export default class QueueItem extends Model {
    static table = 'queue_items';

    // Schema definition for WatermelonDB registration
    static schema = QueueItemSchema;

    @field('encounter_id')
    encounterId!: string;

    @field('file_path')
    filePath!: string;

    @field('status')
    status!: QueueItemStatus;

    @field('retry_count')
    retryCount!: number;

    @field('error_log')
    errorLog?: string;

    @date('created_at')
    createdAt!: Date;

    @date('updated_at')
    updatedAt!: Date;

    /**
     * Helper getter to check if item is processable
     * Returns true if status is PENDING or FAILED with retry_count < 3
     */
    get isProcessable(): boolean {
        if (this.status === QueueItemStatus.PENDING) {
            return true;
        }
        if (this.status === QueueItemStatus.FAILED && this.retryCount < 3) {
            return true;
        }
        return false;
    }
}
