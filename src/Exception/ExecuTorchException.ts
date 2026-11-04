/**
 * ExecuTorchException - Thrown when ExecuTorch model loading or execution fails.
 */

import { TiroScribeException } from './TiroScribeException';

export class ExecuTorchException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'EXECUTORCH_ERROR', originalError);
        this.name = 'ExecuTorchException';
    }
}
