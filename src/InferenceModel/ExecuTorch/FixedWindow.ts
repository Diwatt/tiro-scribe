/**
 * FixedWindow – Aligns a feature buffer onto a frozen export size (truncate or
 * zero-pad). Frozen input sizes are a correctness requirement of the ExecuTorch
 * exports (P2), not an optimization.
 */
export class FixedWindow {
    public static create(samples: Float32Array, elementCount: number): Float32Array {
        const window = new Float32Array(elementCount);
        window.set(samples.subarray(0, Math.min(samples.length, window.length)));

        return window;
    }
}
