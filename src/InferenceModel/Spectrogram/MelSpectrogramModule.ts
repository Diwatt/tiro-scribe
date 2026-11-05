import { Container } from '@/Core/Container';
import type { MelSpectrogram as MelSpectrogramNative } from 'mel-spectrogram';
import type { MelFilterBankOptions } from './MelFilterBankOptions';
import type { LogMelSpectrogramOptions } from './LogMelSpectrogramOptions';

export interface MelSpectrogramModuleInterface {
    computeLogMelSpectrogram(options: LogMelSpectrogramOptions, pcm16Bytes: Uint8Array): Promise<ArrayBuffer>;
    computeMelFilterBank(options: MelFilterBankOptions, pcm16Bytes: Uint8Array): Promise<ArrayBuffer>;
}

/**
 * MelSpectrogramModule – bridge to the native MelSpectrogram Nitro module
 * (single C++ implementation for iOS and Android). The package import stays
 * lazy so module evaluation never touches native code.
 */
export class MelSpectrogramModule implements MelSpectrogramModuleInterface {
    private nativeModule: MelSpectrogramNative | null = null;

    public async computeLogMelSpectrogram(options: LogMelSpectrogramOptions, pcm16Bytes: Uint8Array): Promise<ArrayBuffer> {
        const nativeModule = await this.resolveNativeModule();

        return nativeModule.computeLogMelSpectrogram(
            MelSpectrogramModule.toArrayBuffer(pcm16Bytes),
            options.sampleRateHz,
            options.bandCount,
            options.frameShiftMs,
            options.frameLengthMs,
            options.preemphCoeff,
        );
    }

    public async computeMelFilterBank(options: MelFilterBankOptions, pcm16Bytes: Uint8Array): Promise<ArrayBuffer> {
        const nativeModule = await this.resolveNativeModule();

        return nativeModule.computeMelFilterBank(
            MelSpectrogramModule.toArrayBuffer(pcm16Bytes),
            options.sampleRateHz,
            options.bandCount,
            options.frameShiftMs,
            options.frameLengthMs,
        );
    }

    private async resolveNativeModule(): Promise<MelSpectrogramNative> {
        if (this.nativeModule == null) {
            const { createMelSpectrogram } = await import('mel-spectrogram');
            this.nativeModule = createMelSpectrogram();
        }

        return this.nativeModule;
    }

    // Nitro wants a plain ArrayBuffer: one memcpy is negligible next to the DSP.
    private static toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
        const copy = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(copy).set(bytes);

        return copy;
    }
}

Container.register(MelSpectrogramModule, () => new MelSpectrogramModule());
