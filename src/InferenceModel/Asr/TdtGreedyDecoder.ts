import type { TdtGreedyDecoderOptions } from './TdtGreedyDecoderOptions';

/**
 * Greedy TDT decode loop with the exact HuggingFace ParakeetRNNTDecoder semantics:
 * step 0 lazily runs the LSTM on the start token (blank), then the projected
 * prediction state is reused whenever the last emitted token is blank — the
 * LSTM never sees blanks. A blank with zero duration forces one frame forward.
 *
 * The injected decoderStep owns the LSTM (h, c) state and returns the projected
 * prediction state; this decoder only decides when to step. The injected
 * jointLogits receives a working predState buffer of encoderFrameSize + 1
 * slots whose last slot carries the number of tokens already emitted on the
 * current frame (timestamp bookkeeping).
 */
export class TdtGreedyDecoder {
    private readonly jointLogits: (predState: Float32Array, encoderFrame: Float32Array) => Float32Array;
    private readonly decoderStep: (tokenId: number) => Float32Array;
    private readonly encoderFrameSize: number;
    private readonly vocabularySize: number;
    private readonly blankId: number;
    private readonly durationCount: number;
    private readonly predStateBuffer: Float32Array;

    public constructor(options: TdtGreedyDecoderOptions) {
        this.jointLogits = options.jointLogits;
        this.decoderStep = options.decoderStep;
        this.encoderFrameSize = options.encoderFrameSize;
        this.vocabularySize = options.vocabularySize;
        this.blankId = options.blankId;
        this.durationCount = options.durationCount;
        this.predStateBuffer = new Float32Array(this.encoderFrameSize + 1);
    }

    public decode(encoderFrames: Float32Array) {
        const frameCount = encoderFrames.length / this.encoderFrameSize;
        const tokenIds: number[] = [];
        const frameIndexes: number[] = [];
        let iterationCount = 0;
        let decoderSteps = 0;
        this.copyPredState(this.decoderStep(this.blankId));
        decoderSteps += 1;

        let frameIndex = 0;
        let frameEmissions = 0;
        let lastToken = this.blankId;
        while (frameIndex < frameCount) {
            iterationCount += 1;
            if (lastToken !== this.blankId) {
                this.copyPredState(this.decoderStep(lastToken));
                decoderSteps += 1;
            }
            this.predStateBuffer[this.encoderFrameSize] = frameEmissions;
            const frameStart = frameIndex * this.encoderFrameSize;
            const logits = this.jointLogits(
                this.predStateBuffer,
                encoderFrames.subarray(frameStart, frameStart + this.encoderFrameSize),
            );
            const token = this.argmax(logits, 0, this.vocabularySize);
            const duration =
                this.argmax(logits, this.vocabularySize, this.vocabularySize + this.durationCount) -
                this.vocabularySize;
            if (token !== this.blankId) {
                tokenIds.push(token);
                frameIndexes.push(frameIndex);
                frameEmissions += 1;
            }
            const advance = token === this.blankId && duration === 0 ? 1 : duration;
            if (advance > 0) {
                frameEmissions = 0;
            }
            frameIndex += advance;
            lastToken = token;
        }

        return { tokenIds, frameIndexes, iterationCount, decoderSteps };
    }

    private copyPredState(projected: Float32Array): void {
        this.predStateBuffer.set(projected.subarray(0, Math.min(projected.length, this.encoderFrameSize)), 0);
    }

    private argmax(logits: Float32Array, start: number, end: number): number {
        let bestIndex = start;
        let bestValue = logits[start];
        for (let index = start + 1; index < end; index += 1) {
            if (logits[index] > bestValue) {
                bestValue = logits[index];
                bestIndex = index;
            }
        }

        return bestIndex;
    }
}
