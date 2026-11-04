/**
 * FftTransformer – Iterative radix-2 FFT, in-place on pre-allocated buffers.
 * Single responsibility: complex FFT of one frame. Requires the size to be a
 * power of two. Twiddle tables are built once at construction.
 */
export class FftTransformer {
    private readonly cosineTable: Float64Array;
    private readonly sineTable: Float64Array;

    public constructor(private readonly size: number) {
        const half = size / 2;
        this.cosineTable = new Float64Array(half);
        this.sineTable = new Float64Array(half);
        for (let index = 0; index < half; index += 1) {
            const angle = (2 * Math.PI * index) / size;
            this.cosineTable[index] = Math.cos(angle);
            this.sineTable[index] = -Math.sin(angle);
        }
    }

    public transform(real: Float64Array, imaginary: Float64Array): void {
        this.reorder(real, imaginary);
        for (let length = 2; length <= this.size; length <<= 1) {
            const halfLength = length >> 1;
            const stride = this.size / length;
            for (let group = 0; group < this.size; group += length) {
                for (let offset = 0; offset < halfLength; offset += 1) {
                    const twiddle = offset * stride;
                    const cosine = this.cosineTable[twiddle];
                    const sine = this.sineTable[twiddle];
                    const even = group + offset;
                    const odd = even + halfLength;
                    const rotatedReal = real[odd] * cosine - imaginary[odd] * sine;
                    const rotatedImaginary = real[odd] * sine + imaginary[odd] * cosine;
                    real[odd] = real[even] - rotatedReal;
                    imaginary[odd] = imaginary[even] - rotatedImaginary;
                    real[even] += rotatedReal;
                    imaginary[even] += rotatedImaginary;
                }
            }
        }
    }

    private reorder(real: Float64Array, imaginary: Float64Array): void {
        for (let index = 1, reversed = 0; index < this.size; index += 1) {
            let bit = this.size >> 1;
            for (; (reversed & bit) !== 0; bit >>= 1) {
                reversed ^= bit;
            }
            reversed ^= bit;
            if (index < reversed) {
                this.swap(real, imaginary, index, reversed);
            }
        }
    }

    private swap(real: Float64Array, imaginary: Float64Array, left: number, right: number): void {
        const swapReal = real[left];
        real[left] = real[right];
        real[right] = swapReal;
        const swapImaginary = imaginary[left];
        imaginary[left] = imaginary[right];
        imaginary[right] = swapImaginary;
    }
}
