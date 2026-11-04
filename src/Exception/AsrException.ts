/**
 * AsrException - Thrown when the ASR pipeline fails.
 */

import { TiroScribeException } from './TiroScribeException';

export class AsrException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'ASR_ERROR', originalError);
        this.name = 'AsrException';
    }
}
