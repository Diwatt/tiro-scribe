#include "HybridMelSpectrogram.hpp"

#include <algorithm>
#include <cstdint>
#include <cstring>
#include <stdexcept>
#include <string>
#include <vector>

#include "MelSpectrogramBridge.h"

namespace margelo::nitro::tiroscribe {

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridMelSpectrogram::computeLogMelSpectrogram(
    const std::shared_ptr<ArrayBuffer>& pcm16,
    double sampleRateHz,
    double bandCount,
    double frameShiftMs,
    double frameLengthMs,
    double preemphCoeff) {
    return computeOnWorkerThread(pcm16, true, sampleRateHz, bandCount, frameShiftMs, frameLengthMs, preemphCoeff);
}

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridMelSpectrogram::computeMelFilterBank(
    const std::shared_ptr<ArrayBuffer>& pcm16,
    double sampleRateHz,
    double bandCount,
    double frameShiftMs,
    double frameLengthMs) {
    return computeOnWorkerThread(pcm16, false, sampleRateHz, bandCount, frameShiftMs, frameLengthMs, 0.0);
}

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridMelSpectrogram::computeOnWorkerThread(
    const std::shared_ptr<ArrayBuffer>& pcm16,
    bool isLogMel,
    double sampleRateHz,
    double bandCount,
    double frameShiftMs,
    double frameLengthMs,
    double preemphCoeff) {
    const std::string kind = isLogMel ? "log-mel spectrogram" : "mel filter bank";
    if (pcm16 == nullptr || pcm16->size() == 0 || pcm16->size() % 2 != 0) {
        throw std::runtime_error(kind + ": PCM input is empty or has an invalid byte size");
    }

    // SAFETY: a JS-backed ArrayBuffer may only be read on the JS thread — copy
    // the bytes out here and hand the copy to the worker thread.
    std::vector<uint8_t> pcmBytes(pcm16->size());
    std::memcpy(pcmBytes.data(), pcm16->data(), pcm16->size());

    return Promise<std::shared_ptr<ArrayBuffer>>::async(
        [pcmBytes = std::move(pcmBytes), isLogMel, sampleRateHz, bandCount, frameShiftMs, frameLengthMs, preemphCoeff, kind]() {
            const auto *samples = reinterpret_cast<const int16_t *>(pcmBytes.data());
            const int32_t sampleCount = static_cast<int32_t>(pcmBytes.size() / 2);
            const int32_t bands = static_cast<int32_t>(bandCount);
            const int32_t hop = std::max(static_cast<int32_t>(frameShiftMs * sampleRateHz / 1000.0f), 1);
            const int32_t capacity = (sampleCount / hop + 2) * bands;
            std::vector<float> values(static_cast<size_t>(capacity), 0.0f);

            const int32_t frameCount = isLogMel
                                           ? tiro_compute_log_mel_spectrogram(
                                                 static_cast<float>(sampleRateHz), samples, sampleCount, bands,
                                                 static_cast<float>(frameShiftMs), static_cast<float>(frameLengthMs),
                                                 static_cast<float>(preemphCoeff), values.data(), capacity)
                                           : tiro_compute_mel_filter_bank(
                                                 static_cast<float>(sampleRateHz), samples, sampleCount, bands,
                                                 static_cast<float>(frameShiftMs), static_cast<float>(frameLengthMs),
                                                 values.data(), capacity);
            if (frameCount < 0) {
                throw std::runtime_error(kind + " computation failed (bridge error " + std::to_string(frameCount) + ")");
            }

            // float32 little-endian bytes; ownership moves into the JS ArrayBuffer.
            const size_t byteCount = static_cast<size_t>(frameCount) * static_cast<size_t>(bands) * sizeof(float);
            std::vector<uint8_t> bytes(byteCount);
            std::memcpy(bytes.data(), values.data(), byteCount);

            return ArrayBuffer::move(std::move(bytes));
        });
}

} // namespace margelo::nitro::tiroscribe
