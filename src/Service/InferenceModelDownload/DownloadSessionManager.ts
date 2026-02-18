/**
 * DownloadSessionManager – Manages download sessions and state.
 * Single Responsibility: Track download sessions, progress, and state.
 */

import type { SelectedVariant } from '@/Api';

export type DownloadState = 'pending' | 'downloading' | 'verifying' | 'completed' | 'failed' | 'cancelled';

export interface DownloadSession {
    capability: string;
    config: SelectedVariant;
    state: DownloadState;
    progress: number;
    error?: Error;
    startedAt: Date;
    completedAt?: Date;
}

export class DownloadSessionManager {
    private readonly sessions: Map<string, DownloadSession> = new Map();

    /**
     * Create a new download session.
     */
    public createSession(capability: string, config: SelectedVariant): DownloadSession {
        const session: DownloadSession = {
            capability,
            config,
            state: 'pending',
            progress: 0,
            startedAt: new Date(),
        };

        this.sessions.set(capability, session);
        return session;
    }

    /**
     * Get the current session for a capability.
     */
    public getSession(capability: string): DownloadSession | undefined {
        return this.sessions.get(capability);
    }

    /**
     * Get all active download sessions.
     */
    public getSessions(): DownloadSession[] {
        return Array.from(this.sessions.values());
    }

    /**
     * Update session state.
     */
    public updateSessionState(capability: string, state: DownloadState): void {
        const session = this.sessions.get(capability);
        if (session) {
            session.state = state;
            if (state === 'completed' || state === 'failed' || state === 'cancelled') {
                session.completedAt = new Date();
            }
            this.sessions.set(capability, session);
        }
    }

    /**
     * Update session progress.
     */
    public updateSessionProgress(capability: string, progress: number): void {
        const session = this.sessions.get(capability);
        if (session) {
            session.progress = Math.max(0, Math.min(1, progress)); // Clamp to 0-1
            this.sessions.set(capability, session);
        }
    }

    /**
     * Update session error.
     */
    public updateSessionError(capability: string, error: Error): void {
        const session = this.sessions.get(capability);
        if (session) {
            session.error = error;
            session.state = 'failed';
            session.completedAt = new Date();
            this.sessions.set(capability, session);
        }
    }

    /**
     * Check if a download is in progress for a capability.
     */
    public isDownloading(capability: string): boolean {
        const session = this.sessions.get(capability);
        return session?.state === 'downloading' || session?.state === 'verifying';
    }

    /**
     * Cancel a download session.
     */
    public cancelSession(capability: string): void {
        const session = this.sessions.get(capability);
        if (session && (session.state === 'downloading' || session.state === 'verifying')) {
            session.state = 'cancelled';
            session.completedAt = new Date();
            this.sessions.set(capability, session);
        }
    }

    /**
     * Remove a completed or failed session from tracking.
     */
    public removeSession(capability: string): void {
        this.sessions.delete(capability);
    }

    /**
     * Clear all sessions (useful for cleanup).
     */
    public clearSessions(): void {
        this.sessions.clear();
    }

    /**
     * Get progress for a capability.
     */
    public getProgress(capability: string): number {
        return this.sessions.get(capability)?.progress ?? 0;
    }

    /**
     * Check if a session exists for a capability.
     */
    public hasSession(capability: string): boolean {
        return this.sessions.has(capability);
    }
}
