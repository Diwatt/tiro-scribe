#include "MelSpectrogramBridge.h"

#include <algorithm>
#include <cmath>
#include <vector>

#include "kaldi-native-fbank/csrc/feature-fbank.h"
#include "kaldi-native-fbank/csrc/online-feature.h"
#include "kaldi-native-fbank/csrc/online-nemo-fbank.h"

namespace {

constexpr double kPcmToFloat = 1.0 / 32768.0;
constexpr double kNormalizerEpsilon = 1e-5;
constexpr int32_t kErrorInvalidArgument = -1;
constexpr int32_t kErrorCapacityExceeded = -2;

std::vector<float> pcm16ToFloat(const int16_t *pcm16, int32_t sample_count) {
    std::vector<float> samples(static_cast<size_t>(sample_count));
    for (int32_t index = 0; index < sample_count; index += 1) {
        samples[static_cast<size_t>(index)] = static_cast<float>(pcm16[index] * kPcmToFloat);
    }

    return samples;
}

// Port of MelNormalizer.ts: per-band mean over valid frames,
// scale = std(n-1) + epsilon. Writes normalized values in place.
void normalizePerBand(float *data, int32_t frame_count, int32_t band_count) {
    if (frame_count <= 1) {
        return;
    }
    std::vector<double> means(static_cast<size_t>(band_count));
    std::vector<double> scales(static_cast<size_t>(band_count));
    for (int32_t band = 0; band < band_count; band += 1) {
        double sum = 0;
        for (int32_t frame = 0; frame < frame_count; frame += 1) {
            sum += data[static_cast<size_t>(frame) * band_count + band];
        }
        const double mean = sum / frame_count;
        double variance_sum = 0;
        for (int32_t frame = 0; frame < frame_count; frame += 1) {
            const double centered = data[static_cast<size_t>(frame) * band_count + band] - mean;
            variance_sum += centered * centered;
        }
        means[static_cast<size_t>(band)] = mean;
        scales[static_cast<size_t>(band)] = std::sqrt(variance_sum / (frame_count - 1)) + kNormalizerEpsilon;
    }
    for (int32_t frame = 0; frame < frame_count; frame += 1) {
        for (int32_t band = 0; band < band_count; band += 1) {
            const size_t index = static_cast<size_t>(frame) * band_count + band;
            data[index] = static_cast<float>((data[index] - means[static_cast<size_t>(band)]) / scales[static_cast<size_t>(band)]);
        }
    }
}

}  // namespace

extern "C" int32_t tiro_compute_log_mel_spectrogram(
    float sample_rate,
    const int16_t *pcm16,
    int32_t sample_count,
    int32_t band_count,
    float frame_shift_ms,
    float frame_length_ms,
    float preemph_coeff,
    float *out_features,
    int32_t out_capacity) {
    if (sample_rate <= 0 || pcm16 == nullptr || sample_count <= 0 || band_count <= 0 || out_features == nullptr) {
        return kErrorInvalidArgument;
    }

    knf::NemoFbankOptions options;
    options.samp_freq = sample_rate;
    options.frame_shift_ms = frame_shift_ms;
    options.frame_length_ms = frame_length_ms;
    options.num_mel_bins = band_count;
    options.preemph_coeff = preemph_coeff;
    options.buffered_capacity = 0;

    const std::vector<float> samples = pcm16ToFloat(pcm16, sample_count);
    knf::OnlineNemoFbank fbank(options);
    fbank.AcceptWaveform(sample_rate, samples.data(), sample_count);
    fbank.InputFinished();

    const int32_t frame_count = fbank.NumFramesReady();
    if (frame_count * band_count > out_capacity) {
        return kErrorCapacityExceeded;
    }
    const std::vector<float> frames = fbank.GetFrames(0, frame_count, true);
    if (static_cast<int32_t>(frames.size()) != frame_count * band_count) {
        return kErrorInvalidArgument;
    }
    std::copy(frames.begin(), frames.end(), out_features);
    normalizePerBand(out_features, frame_count, band_count);

    return frame_count;
}

extern "C" int32_t tiro_compute_mel_filter_bank(
    float sample_rate,
    const int16_t *pcm16,
    int32_t sample_count,
    int32_t band_count,
    float frame_shift_ms,
    float frame_length_ms,
    float *out_features,
    int32_t out_capacity) {
    if (sample_rate <= 0 || pcm16 == nullptr || sample_count <= 0 || band_count <= 0 || out_features == nullptr) {
        return kErrorInvalidArgument;
    }

    knf::FbankOptions options;
    options.frame_opts.samp_freq = sample_rate;
    options.frame_opts.frame_shift_ms = frame_shift_ms;
    options.frame_opts.frame_length_ms = frame_length_ms;
    options.frame_opts.dither = 0;
    options.mel_opts.num_bins = band_count;

    const std::vector<float> samples = pcm16ToFloat(pcm16, sample_count);
    knf::OnlineFbank fbank(options);
    fbank.AcceptWaveform(sample_rate, samples.data(), sample_count);
    fbank.InputFinished();

    const int32_t frame_count = fbank.NumFramesReady();
    if (frame_count * band_count > out_capacity) {
        return kErrorCapacityExceeded;
    }
    for (int32_t frame = 0; frame < frame_count; frame += 1) {
        const float *source = fbank.GetFrame(frame);
        float *target = out_features + static_cast<size_t>(frame) * band_count;
        std::copy(source, source + band_count, target);
    }

    return frame_count;
}
