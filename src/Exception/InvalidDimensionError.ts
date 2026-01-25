/**
 * InvalidDimensionError
 * Thrown when dimension values are invalid
 */

import {TiroScribeException} from './TiroScribeException';

export class InvalidDimensionError extends TiroScribeException {
    constructor(message?: string) {
        super(
            message ?? 'Invalid dimension',
            'INVALID_DIMENSION',
        );
        this.name = 'InvalidDimensionError';
    }
}
