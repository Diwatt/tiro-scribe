/**
 * DatabaseError
 * Thrown when database operations fail
 */

import {TiroScribeException} from './TiroScribeException';

export class DatabaseError extends TiroScribeException {
    constructor(message: string, originalError?: Error) {
        super(
            message,
            'DATABASE_ERROR',
            originalError,
        );
        this.name = 'DatabaseError';
    }
}
