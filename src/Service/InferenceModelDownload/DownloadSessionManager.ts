/**
 * DownloadSessionManager – Manages download sessions and state.
 * Single Responsibility: Track download sessions, progress, and state.
 */

import type { SelectedVariant } from '@/Api';
import { DownloadSession, DownloadState } from './DownloadSession';
import dayjs from 'dayjs';

export class DownloadSessionManager {
    private readonly sessions: Map<string, DownloadSession> = new Map();

    /**
     * Create a new download session.
     */
    public create(capability: string, config: SelectedVariant): DownloadSession {
        const session = new DownloadSession(capability, config, DownloadState.Pending, 0, dayjs());

        this.sessions.set(capability, session);
        return session;
    }

    /**
     * Get the current session for a capability.
     */
    public get(capability: string): DownloadSession | undefined {
        return this.sessions.get(capability);
    }

    /**
     * Get all active download sessions.
     */
    public all(): DownloadSession[] {
        return Array.from(this.sessions.values());
    }

    /**
     * Remove a completed or failed session from tracking.
     */
    public remove(capability: string): void {
        this.sessions.delete(capability);
    }

    /**
     * Clear all sessions (useful for cleanup).
     */
    public clearAll(): void {
        this.sessions.clear();
    }

    /**
     * Check if a session exists for a capability.
     */
    public has(capability: string): boolean {
        return this.sessions.has(capability);
    }
}
