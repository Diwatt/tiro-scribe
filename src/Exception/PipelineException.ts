import { TiroScribeException } from './TiroScribeException';

export class PipelineException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'PIPELINE_ERROR', originalError);
        this.name = 'PipelineException';
    }
}
