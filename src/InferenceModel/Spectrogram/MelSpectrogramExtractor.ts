import { Container } from '@/Core/Container';
import { SpectrogramException } from '@/Exception';
import type { MelFilterBankOptions } from './MelFilterBankOptions';
import { MelSpectrogram } from './MelSpectrogram';
import type { LogMelSpectrogramOptions } from './LogMelSpectrogramOptions';
import type { MelSpectrogramModuleInterface } from './MelSpectrogramModule';
import { MelSpectrogramModule } from './MelSpectrogramModule';

export interface MelSpectrogramExtractorInterface {
    extractLogMelSpectrogram(
        pcm16Samples: Int16Array,
        options: LogMelSpectrogramOptions,
    ): Promise<MelSpectrogram>;
    extractMelFilterBank(pcm16Samples: Int16Array, options: MelFilterBankOptions): Promise<MelSpectrogram>;
}

/**
 * MelSpectrogramExtractor – extracts mel spectrograms from 16-bit mono PCM
 * through the native MelSpectrogram module. PCM leaves as little-endian
 * bytes; spectrograms come back row-major inside a MelSpectrogram.
 */
export class MelSpectrogramExtractor implements MelSpectrogramExtractorInterface {
    public constructor(private readonly nativeModule: MelSpectrogramModuleInterface) {}

    public async extractLogMelSpectrogram(
        pcm16Samples: Int16Array,
        options: LogMelSpectrogramOptions,
    ): Promise<MelSpectrogram> {
        const pcm16Bytes = MelSpectrogramExtractor.toLittleEndianBytes(pcm16Samples);
        const payload = await this.nativeModule.computeLogMelSpectrogram(options, pcm16Bytes);

        return MelSpectrogram.fromNative(payload, options.bandCount);
    }

    public async extractMelFilterBank(
        pcm16Samples: Int16Array,
        options: MelFilterBankOptions,
    ): Promise<MelSpectrogram> {
        const pcm16Bytes = MelSpectrogramExtractor.toLittleEndianBytes(pcm16Samples);
        const payload = await this.nativeModule.computeMelFilterBank(options, pcm16Bytes);

        return MelSpectrogram.fromNative(payload, options.bandCount);
    }

    private static toLittleEndianBytes(pcm16Samples: Int16Array): Uint8Array {
        if (pcm16Samples.length === 0) {
            throw new SpectrogramException('PCM samples are empty');
        }

        return new Uint8Array(pcm16Samples.buffer, pcm16Samples.byteOffset, pcm16Samples.byteLength);
    }
}

Container.register(MelSpectrogramExtractor, () => new MelSpectrogramExtractor(Container.get(MelSpectrogramModule)));
