/**
 * OnnxRuntime — lazy-loaded ONNX Runtime singleton.
 *
 * Importing onnxruntime-react-native triggers native module loading.
 * This utility defers that cost until the first actual call, and caches
 * the module for subsequent uses.
 */

import type * as Ort from 'onnxruntime-react-native';

let cached: typeof Ort | null = null;

export async function getOnnxRuntime(): Promise<typeof Ort> {
    cached ??= await import('onnxruntime-react-native');
    return cached;
}
