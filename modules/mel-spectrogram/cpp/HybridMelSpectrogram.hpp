#pragma once

#include <memory>

#include "HybridMelSpectrogramSpec.hpp"

namespace margelo::nitro::tiroscribe {

using namespace margelo::nitro;

/**
 * MelSpectrogram – single C++ HybridObject serving iOS and Android over the
 * vendored kaldi-native-fbank core, so both platforms produce identical
 * spectrogram values by construction.
 */
class HybridMelSpectrogram: public HybridMelSpectrogramSpec {
public:
    explicit HybridMelSpectrogram(): HybridObject(TAG) {}

public:
    std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> computeLogMelSpectrogram(
        const std::shared_ptr<ArrayBuffer>& pcm16,
        double sampleRateHz,
        double bandCount,
        double frameShiftMs,
        double frameLengthMs,
        double preemphCoeff) override;
    std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> computeMelFilterBank(
        const std::shared_ptr<ArrayBuffer>& pcm16,
        double sampleRateHz,
        double bandCount,
        double frameShiftMs,
        double frameLengthMs) override;

private:
    // SAFETY: the ArrayBuffer data must stay alive for the whole computation,
    // hence the shared_ptr copy into the worker lambda.
    std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> computeOnWorkerThread(
        const std::shared_ptr<ArrayBuffer>& pcm16,
        bool isLogMel,
        double sampleRateHz,
        double bandCount,
        double frameShiftMs,
        double frameLengthMs,
        double preemphCoeff);
};

} // namespace margelo::nitro::tiroscribe
