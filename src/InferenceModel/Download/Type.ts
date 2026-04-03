/**
 * Types for InferenceModelDownloader and related components.
 */

/** Progress callback for single download */
export type ProgressCallback = (progress: number) => void;

/** Progress callback for multiple downloads */
export type MultiProgressCallback = (capability: string, progress: number) => void;

/** Update information for model version checking */
export interface UpdateInfo {
    capability: string;
    currentVersion: string | undefined;
    latestVersion: string;
    hasUpdate: boolean;
    sizeBytes: number;
}

/** Storage information for cleanup and monitoring */
export interface StorageInfo {
    totalBytes: number;
    usedBytes: number;
    modelCount: number;
    capabilities: Array<{
        capability: string;
        versions: number;
        sizeBytes: number;
    }>;
}

/** Unified download status enum for all layers (UI, service, database) */
export enum DownloadState {
    Pending = 'pending',
    Downloading = 'downloading',
    Paused = 'paused',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled',
}

/** Download task status (alias for backward compatibility - use DownloadState instead) */
export type DownloadTaskStatus = DownloadState;

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
