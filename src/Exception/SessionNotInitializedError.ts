/**
 * SessionNotInitializedError
 * Thrown when attempting to use a session that hasn't been initialized
 */

import { TiroScribeException } from './TiroScribeException';

export class SessionNotInitializedError extends TiroScribeException {
    public constructor(message?: string) {
        super(message ?? 'Session not initialized', 'SESSION_NOT_INITIALIZED');
        this.name = 'SessionNotInitializedError';
    }
}
