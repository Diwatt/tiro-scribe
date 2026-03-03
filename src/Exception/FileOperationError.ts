/**
 * FileOperationError - Exception for file operation failures
 */

import { TiroScribeException } from './TiroScribeException';

export class FileOperationError extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'FILE_OPERATION_FAILED', originalError);
        this.name = 'FileOperationError';
    }
}
