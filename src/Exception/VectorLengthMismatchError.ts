/**
 * VectorLengthMismatchError
 * Thrown when vectors have different lengths in operations that require matching lengths
 */

import {TiroScribeException} from './TiroScribeException';

export class VectorLengthMismatchError extends TiroScribeException {
    constructor(message?: string) {
        super(
            message ?? 'Vectors must have the same length',
            'VECTOR_LENGTH_MISMATCH',
        );
        this.name = 'VectorLengthMismatchError';
    }
}
