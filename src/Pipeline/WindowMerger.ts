import { PipelineException } from '@/Exception';

/**
 * WindowMerger - merges stream chunks of arbitrary size into whole VAD
 * windows (windowSamples each), carrying leftover samples across chunks so
 * nothing is lost or duplicated. The final leftover samples are returned by
 * takeLeftover() at the end of the stream.
 */
export class WindowMerger {
    private leftover: Float32Array = new Float32Array(0);
    private readonly windowSamples: number;

    public constructor(windowSamples: number) {
        if (windowSamples <= 0) {
            throw new PipelineException(`WindowMerger requires a positive window size, got ${windowSamples}`);
        }

        this.windowSamples = windowSamples;
    }

    public frame(samples: Float32Array): Float32Array[] {
        const merged = this.leftover.length === 0 ? samples : WindowMerger.concat([this.leftover, samples]);
        const windowCount = Math.floor(merged.length / this.windowSamples);
        const windows: Float32Array[] = [];

        for (let index = 0; index < windowCount; index += 1) {
            const start = index * this.windowSamples;
            windows.push(merged.subarray(start, start + this.windowSamples));
        }

        this.leftover = WindowMerger.copy(merged.subarray(windowCount * this.windowSamples));

        return windows;
    }

    /**
     * End of the stream: returns the leftover samples that never filled a
     * whole window (empty when everything was framed), and clears them.
     */
    public takeLeftover(): Float32Array {
        const leftover = this.leftover;
        this.leftover = new Float32Array(0);

        return leftover;
    }

    public reset(): void {
        this.leftover = new Float32Array(0);
    }

    private static concat(parts: Float32Array[]): Float32Array {
        const total = parts.reduce((sum, part) => sum + part.length, 0);
        const merged = new Float32Array(total);
        let offset = 0;

        for (const part of parts) {
            merged.set(part, offset);
            offset += part.length;
        }

        return merged;
    }

    private static copy(samples: Float32Array): Float32Array {
        const copy = new Float32Array(samples.length);
        copy.set(samples);

        return copy;
    }
}
