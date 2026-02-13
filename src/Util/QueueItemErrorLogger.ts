/**
 * Pipeline error logging (Util, not an Entity). Logs are NOT stored in the DB.
 * Runtime-only: in-memory ring buffer + app logger. "Send to support" exports from
 * the buffer. Processing/support only (no PHI); safe for user to share.
 *
 * Use new QueueItemErrorLogger(item, appLog) in pipeline code; record() writes to
 * system log and in-memory buffer. Use getRecentErrors(queueItemId) for UI and
 * exportForSupport() for "send to us".
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { QueueItem } from '../Entity/QueueItem';
import type { PipelineStage, QueueItemErrorEntry } from '../Entity/Type';
import type { LoggerInterface } from '../Service/Logger';

dayjs.extend(utc);

const MAX_BUFFER_SIZE = 200;

type BufferEntry = QueueItemErrorEntry & { queueItemId?: string };

export class QueueItemErrorLogger {
    private static readonly _buffer: BufferEntry[] = [];

    private static _push(entry: BufferEntry): void {
        QueueItemErrorLogger._buffer.push(entry);
        if (QueueItemErrorLogger._buffer.length > MAX_BUFFER_SIZE) {
            QueueItemErrorLogger._buffer.shift();
        }
    }

    constructor(
        private readonly queueItem: QueueItem,
        private readonly appLog?: LoggerInterface,
    ) {}

    /** Record error to app logger and in-memory buffer only (no DB). */
    record(stage: PipelineStage, message: string): void {
        const entry: BufferEntry = {
            timestamp: dayjs.utc().toISOString(),
            stage,
            message,
            queueItemId: this.queueItem.getUuid(),
        };
        QueueItemErrorLogger._push(entry);
        this.appLog?.warn(`[${stage}] ${message}`);
    }

    /** No-op: logs are not in DB, so nothing to clear. Kept for API compatibility. */
    clear(): void {
        /* no-op */
    }

    /** Format a single error entry as readable text. */
    static formatOne(entry: QueueItemErrorEntry): string {
        return `[${entry.timestamp}] ${entry.stage}: ${entry.message}`;
    }

    /** Format error entries as readable text (one line per entry). */
    static format(entries: QueueItemErrorEntry[]): string {
        return entries.map(QueueItemErrorLogger.formatOne).join('\n');
    }

    /**
     * Get recent errors from the in-memory buffer, optionally for one queue item.
     * Newest last. Use for UI ("last error for this item") or export.
     */
    static getRecentErrors(queueItemId?: string): QueueItemErrorEntry[] {
        const list = queueItemId ? QueueItemErrorLogger._buffer.filter((e) => e.queueItemId === queueItemId) : [...QueueItemErrorLogger._buffer];
        return list.map(({ queueItemId: _, ...entry }) => entry);
    }

    /**
     * Export for "send to support": plain text from in-memory buffer.
     * Optional queueItemId to include as header and/or filter to that item.
     * Contains only processing data (no private data).
     */
    static exportForSupport(options?: { queueItemId?: string }): string {
        const entries = QueueItemErrorLogger.getRecentErrors(options?.queueItemId);
        const header = options?.queueItemId ? `QueueItem: ${options.queueItemId}\n` : '';
        const body = entries.length ? QueueItemErrorLogger.format(entries) : '(no errors recorded in this session)';
        return header + body;
    }
}
