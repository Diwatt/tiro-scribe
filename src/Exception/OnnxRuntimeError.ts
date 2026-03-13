import { TiroScribeException } from './TiroScribeException';

/**
 * Thrown when the onnxruntime-react-native native module cannot be loaded
 * or when its bindings are missing at runtime.
 */
export class OnnxRuntimeError extends TiroScribeException {
    public constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
        super(message, 'ONNX_RUNTIME_ERROR', originalError, context);
        this.name = 'OnnxRuntimeError';
    }
}
