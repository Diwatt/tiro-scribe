import { SpectrogramException } from '@/Exception';

/**
 * MelSpectrogram – immutable result of a native mel spectrogram computation.
 * Row-major layout: row `frame` starts at `frame * bandCount`.
 */
export class MelSpectrogram {
    private constructor(
        public readonly frameCount: number,
        public readonly bandCount: number,
        public readonly values: Float32Array,
    ) {}

    public static create(values: Float32Array, bandCount: number): MelSpectrogram {
        if (bandCount <= 0) {
            throw new SpectrogramException(`Band count must be positive, received ${bandCount}`);
        }
        if (values.length === 0) {
            throw new SpectrogramException('Mel spectrogram values are empty');
        }
        if (values.length % bandCount !== 0) {
            throw new SpectrogramException(
                `Mel spectrogram length ${values.length} is not a multiple of band count ${bandCount}`,
            );
        }

        return new MelSpectrogram(values.length / bandCount, bandCount, values);
    }

    /** Decodes the native float32 little-endian buffer into a spectrogram. */
    public static fromNative(raw: ArrayBuffer, bandCount: number): MelSpectrogram {
        if (raw.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
            throw new SpectrogramException(
                `Native spectrogram byte length ${raw.byteLength} is not a multiple of ${Float32Array.BYTES_PER_ELEMENT}`,
            );
        }

        return MelSpectrogram.create(new Float32Array(raw), bandCount);
    }
}
