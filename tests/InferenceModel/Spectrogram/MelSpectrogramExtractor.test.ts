import { SpectrogramException } from '@/Exception';
import { LogMelSpectrogramOptions, MelFilterBankOptions, MelSpectrogramExtractor } from '@/InferenceModel/Spectrogram';
import type { MelSpectrogramModuleInterface } from '@/InferenceModel/Spectrogram';

describe('MelSpectrogramExtractor', () => {
    const createFloat32Buffer = (values: number[]): ArrayBuffer => {
        const buffer = new ArrayBuffer(values.length * Float32Array.BYTES_PER_ELEMENT);
        new Float32Array(buffer).set(values);

        return buffer;
    };

    const createNativeModule = () => {
        const computeLogMelSpectrogram = jest.fn().mockResolvedValue(createFloat32Buffer([0.5, 0.25, 0.75, 1.25]));
        const computeMelFilterBank = jest.fn().mockResolvedValue(createFloat32Buffer([1, 2, 3, 4]));
        const nativeModule: MelSpectrogramModuleInterface = { computeLogMelSpectrogram, computeMelFilterBank };

        return { nativeModule, computeLogMelSpectrogram, computeMelFilterBank };
    };

    it('forwards log-mel options and little-endian PCM bytes, wrapping the payload in a spectrogram', async () => {
        const { nativeModule, computeLogMelSpectrogram } = createNativeModule();
        const extractor = new MelSpectrogramExtractor(nativeModule);
        const options = LogMelSpectrogramOptions.create(16000, 2, 10, 25, 0.97);

        const spectrogram = await extractor.extractLogMelSpectrogram(Int16Array.from([1, 256]), options);

        expect(computeLogMelSpectrogram).toHaveBeenCalledTimes(1);
        const [forwardedOptions, forwardedBytes] = computeLogMelSpectrogram.mock.calls[0];
        expect(forwardedOptions).toBe(options);
        expect(Array.from(forwardedBytes)).toEqual([1, 0, 0, 1]);
        expect(spectrogram.bandCount).toBe(options.bandCount);
        expect(Array.from(spectrogram.values)).toEqual([0.5, 0.25, 0.75, 1.25]);
        expect(spectrogram.frameCount).toBe(2);
    });

    it('forwards filter-bank options and little-endian PCM bytes, wrapping the payload in a spectrogram', async () => {
        const { nativeModule, computeMelFilterBank } = createNativeModule();
        const extractor = new MelSpectrogramExtractor(nativeModule);
        const options = MelFilterBankOptions.create(16000, 4, 10, 25);

        const spectrogram = await extractor.extractMelFilterBank(Int16Array.from([-1, 512]), options);

        expect(computeMelFilterBank).toHaveBeenCalledTimes(1);
        const [forwardedOptions, forwardedBytes] = computeMelFilterBank.mock.calls[0];
        expect(forwardedOptions).toBe(options);
        expect(Array.from(forwardedBytes)).toEqual([255, 255, 0, 2]);
        expect(spectrogram.bandCount).toBe(options.bandCount);
        expect(Array.from(spectrogram.values)).toEqual([1, 2, 3, 4]);
        expect(spectrogram.frameCount).toBe(1);
    });

    it('rejects empty log-mel PCM before reaching the native module', async () => {
        const { nativeModule, computeLogMelSpectrogram } = createNativeModule();
        const extractor = new MelSpectrogramExtractor(nativeModule);
        const options = LogMelSpectrogramOptions.create(16000, 2, 10, 25, 0.97);

        await expect(extractor.extractLogMelSpectrogram(new Int16Array(0), options)).rejects.toThrow(
            SpectrogramException,
        );
        expect(computeLogMelSpectrogram).not.toHaveBeenCalled();
    });

    it('rejects empty filter-bank PCM before reaching the native module', async () => {
        const { nativeModule, computeMelFilterBank } = createNativeModule();
        const extractor = new MelSpectrogramExtractor(nativeModule);
        const options = MelFilterBankOptions.create(16000, 4, 10, 25);

        await expect(extractor.extractMelFilterBank(new Int16Array(0), options)).rejects.toThrow(SpectrogramException);
        expect(computeMelFilterBank).not.toHaveBeenCalled();
    });

    it('propagates native module rejections', async () => {
        const { nativeModule, computeLogMelSpectrogram } = createNativeModule();
        computeLogMelSpectrogram.mockRejectedValue(new Error('NATIVE_DSP_FAILED'));
        const extractor = new MelSpectrogramExtractor(nativeModule);
        const options = LogMelSpectrogramOptions.create(16000, 2, 10, 25, 0.97);

        await expect(extractor.extractLogMelSpectrogram(Int16Array.from([1, 256]), options)).rejects.toThrow(
            'NATIVE_DSP_FAILED',
        );
    });
});
