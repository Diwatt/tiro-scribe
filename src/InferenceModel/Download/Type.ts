/**
 * Types for InferenceModelDownloader and related components.
 */

/** Unified download status enum for all layers (UI, service, database) */
export enum DownloadState {
    Pending = 'pending',
    Downloading = 'downloading',
    Paused = 'paused',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled',
}

/** Download task DTO */
export interface DownloadTask {
    id: string;
    capability: string;
    language?: string;
    nbRetries: number;
    maxRetries: number;
    status: DownloadState;
    error?: Error;
    createdAt: Date;
    updatedAt: Date;
}

/** Queue statistics */
export interface QueueStats {
    total: number;
    pending: number;
    active: number;
    completed: number;
    failed: number;
}
