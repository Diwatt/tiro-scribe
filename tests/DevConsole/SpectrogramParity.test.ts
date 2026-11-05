import { Container } from '../../src/Core/Container';
import { AppLogger } from '../../src/Core/AppLogger';
import { SpectrogramParity } from '../../src/DevConsole/State/SpectrogramParity';
import { SpectrogramParityVerdict } from '../../src/DevConsole/Data/SpectrogramParityResult';
import { SourceIngestException } from '../../src/DevConsole/Ingest/SourceIngestException';
import { AsrMelSpectrogram } from '../../src/InferenceModel/Asr';
import { LogMelSpectrogramOptions, MelSpectrogram } from '../../src/InferenceModel/Spectrogram';
import type { MelSpectrogramExtractorInterface } from '../../src/InferenceModel/Spectrogram';

const SAMPLE_RATE_HZ = 16000;
const NUM_MEL_BINS = 128;
const PCM_SECONDS = 0.3;
const FRAME_SHIFT_HOP = 160;

describe('SpectrogramParity', () => {
    const flatFilters = (): number[][] =>
        Array.from({ length: NUM_MEL_BINS }, () => new Array<number>(AsrMelSpectrogram.N_FFT / 2 + 1).fill(1));

    const filtersJson = (): string =>
        JSON.stringify({ rows: NUM_MEL_BINS, cols: AsrMelSpectrogram.N_FFT / 2 + 1, data: flatFilters() });

    const syntheticPcm = (): Float32Array => {
        const samples = new Float32Array(Math.floor(PCM_SECONDS * SAMPLE_RATE_HZ));
        for (let index = 0; index < samples.length; index += 1) {
            samples[index] = 0.1 * Math.sin((2 * Math.PI * 440 * index) / SAMPLE_RATE_HZ);
        }

        return samples;
    };

    const jsNormalizedMel = (pcm: Float32Array): Float32Array =>
        AsrMelSpectrogram.create(flatFilters()).compute(pcm);

    const createFakeExtractor = (spectrogram: MelSpectrogram): MelSpectrogramExtractorInterface => ({
        extractLogMelSpectrogram: jest.fn().mockResolvedValue(spectrogram),
        extractMelFilterBank: jest.fn(),
    });

    const createParity = (extractor: MelSpectrogramExtractorInterface, pcm: Float32Array): SpectrogramParity =>
        new SpectrogramParity(
            Container.get(AppLogger),
            { readFullPcm: jest.fn().mockResolvedValue(pcm) } as never,
            undefined,
            { readText: jest.fn().mockResolvedValue(filtersJson()) } as never,
            extractor,
        );

    it('passes when the native extractor matches the JS oracle within tolerance', async () => {
        const pcm = syntheticPcm();
        const expected = jsNormalizedMel(pcm);
        const validFrames = Math.floor(pcm.length / FRAME_SHIFT_HOP);
        const extractLogMelSpectrogram = jest
            .fn()
            .mockResolvedValue(MelSpectrogram.create(Float32Array.from(expected), NUM_MEL_BINS));
        const extractor: MelSpectrogramExtractorInterface = {
            extractLogMelSpectrogram,
            extractMelFilterBank: jest.fn(),
        };
        const parity = createParity(extractor, pcm);

        await parity.run();

        const result = parity.snapshot.result;
        expect(result).not.toBeNull();
        expect(result?.verdict).toBe(SpectrogramParityVerdict.Passed);
        expect(result?.comparedFrames).toBe(validFrames);
        expect(result?.maxAbsDiff).toBeLessThanOrEqual(SpectrogramParity.MAX_ABS_DIFF_THRESHOLD);
        expect(result?.cosineSimilarity).toBeGreaterThanOrEqual(SpectrogramParity.COSINE_SIMILARITY_THRESHOLD);
        expect(extractLogMelSpectrogram).toHaveBeenCalledTimes(1);
        const [forwardedPcm, forwardedOptions] = extractLogMelSpectrogram.mock.calls[0];
        expect(forwardedPcm).toBeInstanceOf(Int16Array);
        expect(forwardedOptions).toBeInstanceOf(LogMelSpectrogramOptions);
        expect(forwardedOptions.bandCount).toBe(SpectrogramParity.NUM_MEL_BINS);
        expect(forwardedOptions.frameShiftMs).toBe(SpectrogramParity.FRAME_SHIFT_MS);
        expect(forwardedOptions.frameLengthMs).toBe(SpectrogramParity.FRAME_LENGTH_MS);
        expect(forwardedOptions.preemphCoeff).toBe(SpectrogramParity.PREEMPH_COEFF);
    });

    it('fails when the native extractor diverges beyond the tolerance', async () => {
        const pcm = syntheticPcm();
        const divergent = jsNormalizedMel(pcm).map((value) => value + 0.5);
        const parity = createParity(
            createFakeExtractor(MelSpectrogram.create(divergent, NUM_MEL_BINS)),
            pcm,
        );

        await parity.run();

        expect(parity.snapshot.result?.verdict).toBe(SpectrogramParityVerdict.Failed);
    });

    it('fails when the cosine similarity collapses even with small diffs', async () => {
        const pcm = syntheticPcm();
        const scrambled = jsNormalizedMel(pcm).slice().reverse();
        const parity = createParity(createFakeExtractor(MelSpectrogram.create(scrambled, NUM_MEL_BINS)), pcm);

        await parity.run();

        expect(parity.snapshot.result?.cosineSimilarity).toBeLessThan(SpectrogramParity.COSINE_SIMILARITY_THRESHOLD);
        expect(parity.snapshot.result?.verdict).toBe(SpectrogramParityVerdict.Failed);
    });

    it('compares only the overlapping frames between JS and native outputs', async () => {
        const pcm = syntheticPcm();
        const expected = jsNormalizedMel(pcm);
        const nativeFrames = Math.floor(pcm.length / FRAME_SHIFT_HOP) - 2;
        const nativeSpectrogram = MelSpectrogram.create(
            Float32Array.from(expected.subarray(0, nativeFrames * NUM_MEL_BINS)),
            NUM_MEL_BINS,
        );
        const parity = createParity(createFakeExtractor(nativeSpectrogram), pcm);

        await parity.run();

        expect(parity.snapshot.result?.nativeFrameCount).toBe(nativeFrames);
        expect(parity.snapshot.result?.comparedFrames).toBe(nativeFrames);
        expect(parity.snapshot.result?.verdict).toBe(SpectrogramParityVerdict.Passed);
    });

    it('reports a native failure in the snapshot error', async () => {
        const extractor: MelSpectrogramExtractorInterface = {
            extractLogMelSpectrogram: jest.fn().mockRejectedValue(new Error('DSP_COMPUTATION_FAILED')),
            extractMelFilterBank: jest.fn(),
        };
        const parity = createParity(extractor, syntheticPcm());

        await expect(parity.run()).rejects.toThrow('DSP_COMPUTATION_FAILED');
        expect(parity.snapshot.error).toContain('DSP_COMPUTATION_FAILED');
        expect(parity.isLoading).toBe(false);
    });

    it('reports empty parity audio in the snapshot error without calling the extractor', async () => {
        const extractLogMelSpectrogram = jest.fn();
        const extractor: MelSpectrogramExtractorInterface = {
            extractLogMelSpectrogram,
            extractMelFilterBank: jest.fn(),
        };
        const parity = createParity(extractor, new Float32Array(0));

        await expect(parity.run()).rejects.toThrow(SourceIngestException);
        expect(parity.snapshot.error).toContain('empty');
        expect(parity.isLoading).toBe(false);
        expect(extractLogMelSpectrogram).not.toHaveBeenCalled();
    });

    it('reports a no-overlap error when the JS output has no valid frames', async () => {
        const pcm = syntheticPcm().slice(0, FRAME_SHIFT_HOP - 1);
        const jsMel = jsNormalizedMel(syntheticPcm());
        const nativeSpectrogram = MelSpectrogram.create(Float32Array.from(jsMel.slice(0, NUM_MEL_BINS)), NUM_MEL_BINS);
        const parity = createParity(createFakeExtractor(nativeSpectrogram), pcm);

        await expect(parity.run()).rejects.toThrow(SourceIngestException);
        expect(parity.snapshot.error).toContain('overlapping');
        expect(parity.isLoading).toBe(false);
    });

    it('toggles isLoading from true during a run to false after completion', async () => {
        const pcm = syntheticPcm();
        const expected = jsNormalizedMel(pcm);
        let resolveExtraction: (spectrogram: MelSpectrogram) => void = () => undefined;
        const extractLogMelSpectrogram = jest.fn().mockImplementation(
            () =>
                new Promise<MelSpectrogram>((resolve) => {
                    resolveExtraction = resolve;
                }),
        );
        const extractor: MelSpectrogramExtractorInterface = {
            extractLogMelSpectrogram,
            extractMelFilterBank: jest.fn(),
        };
        const parity = createParity(extractor, pcm);

        expect(parity.isLoading).toBe(false);
        const pending = parity.run();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(extractLogMelSpectrogram).toHaveBeenCalledTimes(1);
        expect(parity.isLoading).toBe(true);

        resolveExtraction(MelSpectrogram.create(Float32Array.from(expected), NUM_MEL_BINS));
        await pending;

        expect(parity.isLoading).toBe(false);
    });
});
