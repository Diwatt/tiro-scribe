import { SpectrogramException } from '@/Exception';

/**
 * MelGeometryOptions – shared frame geometry of mel computations: sample rate,
 * band count, frame shift and frame length in milliseconds.
 */
export abstract class MelGeometryOptions {
    protected constructor(
        public readonly sampleRateHz: number,
        public readonly bandCount: number,
        public readonly frameShiftMs: number,
        public readonly frameLengthMs: number,
    ) {
        if (sampleRateHz <= 0) {
            throw new SpectrogramException(`Sample rate must be positive, received ${sampleRateHz}`);
        }
        if (bandCount <= 0) {
            throw new SpectrogramException(`Band count must be positive, received ${bandCount}`);
        }
        if (frameShiftMs <= 0) {
            throw new SpectrogramException(`Frame shift must be positive, received ${frameShiftMs}`);
        }
        if (frameLengthMs <= 0) {
            throw new SpectrogramException(`Frame length must be positive, received ${frameLengthMs}`);
        }
    }
}
