import type { HybridObject } from 'react-native-nitro-modules'

/**
 * Native mel spectrogram computation over the vendored kaldi-native-fbank
 * core. One C++ implementation serves iOS and Android: both platforms
 * produce identical values by construction.
 */
export interface MelSpectrogram extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
    /** Normalized log-mel spectrogram (ASR reference) from 16-bit little-endian PCM. */
    computeLogMelSpectrogram(
        pcm16: ArrayBuffer,
        sampleRateHz: number,
        bandCount: number,
        frameShiftMs: number,
        frameLengthMs: number,
        preemphCoeff: number,
    ): Promise<ArrayBuffer>
    /** Mel filter bank energies (speaker reference) from 16-bit little-endian PCM. */
    computeMelFilterBank(
        pcm16: ArrayBuffer,
        sampleRateHz: number,
        bandCount: number,
        frameShiftMs: number,
        frameLengthMs: number,
    ): Promise<ArrayBuffer>
}
