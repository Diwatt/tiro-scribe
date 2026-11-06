import { Container } from '@/Core/Container';

/**
 * PcmSampleConverter – Converts 16-bit PCM sample formats.
 * Single responsibility: sample format math (int16 <-> float32, channel mixing).
 * Stateless; the class owns the 16-bit PCM constants.
 */
export class PcmSampleConverter {
    public static readonly BYTES_PER_SAMPLE = 2;
    public static readonly MAX_INT16 = 32768.0;
    public static readonly INT16_MIN = -32768;
    public static readonly INT16_MAX = 32767;

    public int16ToFloat32(int16Array: Int16Array): Float32Array {
        const floatArray = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            floatArray[i] = int16Array[i] / PcmSampleConverter.MAX_INT16;
        }
        return floatArray;
    }

    public bytesToInt16(data: Uint8Array): Int16Array {
        const sampleCount = Math.floor(data.byteLength / PcmSampleConverter.BYTES_PER_SAMPLE);
        const samples = new Int16Array(sampleCount);
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        for (let i = 0; i < sampleCount; i++) {
            samples[i] = view.getInt16(i * PcmSampleConverter.BYTES_PER_SAMPLE, true);
        }

        return samples;
    }

    public stereoToMono(int16Array: Int16Array): Float32Array {
        const sampleCount = Math.floor(int16Array.length / 2);
        const mono = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
            const left = int16Array[i * 2];
            const right = int16Array[i * 2 + 1];
            mono[i] = (left + right) / (2 * PcmSampleConverter.MAX_INT16);
        }
        return mono;
    }

    public float32ToInt16(floatArray: Float32Array): Int16Array {
        const int16Array = new Int16Array(floatArray.length);
        for (let i = 0; i < floatArray.length; i++) {
            int16Array[i] = Math.max(
                PcmSampleConverter.INT16_MIN,
                Math.min(PcmSampleConverter.INT16_MAX, Math.round(floatArray[i] * PcmSampleConverter.MAX_INT16)),
            );
        }
        return int16Array;
    }
}

Container.register(PcmSampleConverter, () => new PcmSampleConverter());
