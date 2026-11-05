/**
 * MelSpectrogramBridge – C bridge over the vendored kaldi-native-fbank subset.
 *
 * Plain C API on purpose: it is imported by Swift through the pod umbrella
 * (C headers only; C++ headers would break the Swift clang importer) and by
 * the Android JNI layer. All functions take 16-bit little-endian PCM and
 * perform the s16 -> float32 conversion internally so JS never handles
 * float audio samples.
 *
 * Row-major output: frame * band_count + band, only `frame_count` rows
 * written. Returns the frame count written, or a negative error code.
 */

#ifndef MEL_SPECTROGRAM_BRIDGE_H
#define MEL_SPECTROGRAM_BRIDGE_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Normalized log-mel spectrogram (ASR reference): whole-buffer preemphasis,
 * centered zero-padded STFT (symmetric Hann, zero-padded to n_fft), slaney
 * mel filters, log(mel + 2^-24), then per-band mean/variance normalization
 * over the valid frames (port of MelNormalizer.ts).
 */
int32_t tiro_compute_log_mel_spectrogram(
    float sample_rate,
    const int16_t *pcm16,
    int32_t sample_count,
    int32_t band_count,
    float frame_shift_ms,
    float frame_length_ms,
    float preemph_coeff,
    float *out_features,
    int32_t out_capacity);

/**
 * Mel filter bank energies (speaker reference): Kaldi-style fbank (povey
 * window, dither 0, remove_dc_offset, log-mel energies). Not normalized.
 */
int32_t tiro_compute_mel_filter_bank(
    float sample_rate,
    const int16_t *pcm16,
    int32_t sample_count,
    int32_t band_count,
    float frame_shift_ms,
    float frame_length_ms,
    float *out_features,
    int32_t out_capacity);

#ifdef __cplusplus
}
#endif

#endif /* MEL_SPECTROGRAM_BRIDGE_H */
