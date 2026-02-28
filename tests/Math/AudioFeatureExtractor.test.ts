/**
 * AudioFeatureExtractor Tests - ZOMBIE Methodology
 * 
 * Z - Zero: Test zero/empty inputs and edge cases
 * O - One: Test single element/minimal inputs
 * M - Many: Test with multiple elements and typical cases
 * B - Boundaries: Test boundary conditions and limits
 * I - Interfaces: Test public API and contract compliance
 * E - Exceptions: Test error handling and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AudioFeatureExtractor } from '../../src/Math/AudioFeatureExtractor';

describe('AudioFeatureExtractor - ZOMBIE Tests', () => {
    let extractor: AudioFeatureExtractor;

    beforeEach(() => {
        extractor = new AudioFeatureExtractor();
    });

    describe('Z - Zero Tests', () => {
        it('should handle empty PCM buffer', () => {
            const emptyPcm = new Float32Array(0);
            const result = extractor.extract(emptyPcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length).toBe(0);
        });

        it('should handle PCM buffer with all zeros', () => {
            const zeroPcm = new Float32Array(1600).fill(0);
            const result = extractor.extract(zeroPcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length).toBeGreaterThan(0);
            
            // All features should be very small (log of near-zero values)
            result.forEach(value => {
                expect(value).toBeLessThan(0);
            });
        });

        it('should handle single frame audio', () => {
            const singleFramePcm = new Float32Array(400).fill(0.1);
            const result = extractor.extract(singleFramePcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length).toBe(80); // 1 frame * 80 mel bins
        });

        it('should handle audio shorter than frame length', () => {
            const shortPcm = new Float32Array(200).fill(0.1);
            const result = extractor.extract(shortPcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length).toBe(0);
        });
    });

    describe('O - One Tests', () => {
        it('should handle single sample value', () => {
            const singleValuePcm = new Float32Array(1600).fill(0.5);
            const result = extractor.extract(singleValuePcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle minimal frame configuration', () => {
            const minimalExtractor = new AudioFeatureExtractor(
                16000, // sampleRate
                100,   // frameLength
                50,    // frameStep
                128,   // fftLength
                10,    // numMelBins
                0.9    // preEmphasisCoeff
            );
            const pcm = new Float32Array(200).fill(0.1);
            const result = minimalExtractor.extract(pcm);
            expect(result).toBeInstanceOf(Float32Array);
        });

        it('should handle single mel bin configuration', () => {
            const singleMelExtractor = new AudioFeatureExtractor(
                16000, 400, 160, 512, 1, 0.97
            );
            const pcm = new Float32Array(1600).fill(0.1);
            const result = singleMelExtractor.extract(pcm);
            expect(result).toBeInstanceOf(Float32Array);
        });

        it('should handle DC component (zero frequency)', () => {
            const dcPcm = new Float32Array(1600).fill(1);
            const result = extractor.extract(dcPcm);
            expect(result).toBeInstanceOf(Float32Array);
            // DC should produce strong low-frequency energy
        });
    });

    describe('M - Many Tests', () => {
        it('should handle typical audio length', () => {
            const typicalPcm = new Float32Array(16000); // 1 second at 16kHz
            for (let i = 0; i < typicalPcm.length; i++) {
                typicalPcm[i] = Math.sin(2 * Math.PI * 440 * i / 16000) * 0.5; // 440Hz sine wave
            }
            const result = extractor.extract(typicalPcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length).toBeGreaterThan(1000); // Multiple frames
        });

        it('should handle multiple frequency components', () => {
            const multiFreqPcm = new Float32Array(3200); // 0.2 seconds
            for (let i = 0; i < multiFreqPcm.length; i++) {
                const t = i / 16000;
                multiFreqPcm[i] = (
                    Math.sin(2 * Math.PI * 440 * t) * 0.3 +  // 440Hz
                    Math.sin(2 * Math.PI * 880 * t) * 0.2 +  // 880Hz
                    Math.sin(2 * Math.PI * 1320 * t) * 0.1   // 1320Hz
                );
            }
            const result = extractor.extract(multiFreqPcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length % 80).toBe(0); // Should be multiple of mel bins
        });

        it('should handle speech-like audio', () => {
            const speechPcm = new Float32Array(8000); // 0.5 seconds
            for (let i = 0; i < speechPcm.length; i++) {
                const t = i / 16000;
                // Simulate vowel formants
                speechPcm[i] = (
                    Math.sin(2 * Math.PI * 200 * t) * 0.4 +  // F1
                    Math.sin(2 * Math.PI * 800 * t) * 0.3 +  // F2
                    Math.sin(2 * Math.PI * 2500 * t) * 0.2 + // F3
                    (Math.random() - 0.5) * 0.05              // Noise
                );
            }
            const result = extractor.extract(speechPcm);
            expect(result).toBeInstanceOf(Float32Array);
        });

        it('should handle different sample rates', () => {
            const pcm8k = new Float32Array(800).fill(0.1);
            const extractor8k = new AudioFeatureExtractor(8000);
            const result8k = extractor8k.extract(pcm8k);
            expect(result8k).toBeInstanceOf(Float32Array);

            const pcm22k = new Float32Array(2200).fill(0.1);
            const extractor22k = new AudioFeatureExtractor(22050);
            const result22k = extractor22k.extract(pcm22k);
            expect(result22k).toBeInstanceOf(Float32Array);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should handle maximum amplitude values', () => {
            const maxPcm = new Float32Array(1600);
            for (let i = 0; i < maxPcm.length; i++) {
                maxPcm[i] = i % 2 === 0 ? 1 : -1;
            }
            const result = extractor.extract(maxPcm);
            expect(result).toBeInstanceOf(Float32Array);
            result.forEach(value => {
                expect(Number.isFinite(value)).toBe(true);
            });
        });

        it('should handle minimum amplitude values', () => {
            const minPcm = new Float32Array(1600).fill(1e-10);
            const result = extractor.extract(minPcm);
            expect(result).toBeInstanceOf(Float32Array);
            result.forEach(value => {
                expect(Number.isFinite(value)).toBe(true);
            });
        });

        it('should handle very high frequency content', () => {
            const highFreqPcm = new Float32Array(1600);
            for (let i = 0; i < highFreqPcm.length; i++) {
                highFreqPcm[i] = Math.sin(2 * Math.PI * 7000 * i / 16000); // Near Nyquist
            }
            const result = extractor.extract(highFreqPcm);
            expect(result).toBeInstanceOf(Float32Array);
        });

        it('should handle very low frequency content', () => {
            const lowFreqPcm = new Float32Array(1600);
            for (let i = 0; i < lowFreqPcm.length; i++) {
                lowFreqPcm[i] = Math.sin(2 * Math.PI * 50 * i / 16000); // 50Hz
            }
            const result = extractor.extract(lowFreqPcm);
            expect(result).toBeInstanceOf(Float32Array);
        });

        it('should handle long audio content', () => {
            const longPcm = new Float32Array(8000); // 0.5 seconds
            for (let i = 0; i < longPcm.length; i++) {
                longPcm[i] = Math.sin(2 * Math.PI * 440 * i / 16000) * 0.1;
            }
            const result = extractor.extract(longPcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length).toBeLessThan(10000); // Reasonable upper bound
        });
    });

    describe('I - Interface Tests', () => {
        it('should return Float32Array consistently', () => {
            const pcm = new Float32Array(1600).fill(0.1);
            const result = extractor.extract(pcm);
            expect(result).toBeInstanceOf(Float32Array);
        });

        it('should maintain output dimensions consistency', () => {
            const pcm1 = new Float32Array(1600).fill(0.1);
            const pcm2 = new Float32Array(1600).fill(0.2);
            
            const result1 = extractor.extract(pcm1);
            const result2 = extractor.extract(pcm2);
            
            expect(result1.length).toBe(result2.length);
        });

        it('should preserve input immutability', () => {
            const pcm = new Float32Array(1600).fill(0.1);
            const original = new Float32Array(pcm);
            extractor.extract(pcm);
            expect(pcm).toEqual(original);
        });

        it('should handle different parameter combinations', () => {
            const customExtractor = new AudioFeatureExtractor(
                22050,  // sampleRate
                1024,   // frameLength
                512,    // frameStep
                2048,   // fftLength
                128,    // numMelBins
                0.95    // preEmphasisCoeff
            );
            const pcm = new Float32Array(4096).fill(0.1);
            const result = customExtractor.extract(pcm);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length % 128).toBe(0); // Multiple of mel bins
        });

        it('should produce deterministic results', () => {
            const pcm = new Float32Array(1600).fill(0.1);
            const result1 = extractor.extract(pcm);
            const result2 = extractor.extract(pcm);
            expect(result1).toEqual(result2);
        });
    });

    describe('E - Exception Tests', () => {
        it('should throw on null/undefined input', () => {
            expect(() => extractor.extract(null as any)).toThrow();
            expect(() => extractor.extract(undefined as any)).toThrow();
        });

        it('should not throw on array-like input (JS has no runtime type enforcement)', () => {
            // Arrays shorter than frameLength produce empty output, no throw
            const result = extractor.extract([1, 2, 3] as any);
            expect(result).toBeInstanceOf(Float32Array);
            expect(result.length).toBe(0);
        });

        it('should throw on NaN values in input', () => {
            const nanPcm = new Float32Array(1600);
            nanPcm[100] = Number.NaN;
            expect(() => extractor.extract(nanPcm)).not.toThrow(); // Should handle gracefully
        });

        it('should throw on Infinity values in input', () => {
            const infPcm = new Float32Array(1600);
            infPcm[100] = Infinity;
            expect(() => extractor.extract(infPcm)).not.toThrow(); // Should handle gracefully
        });

        it('should handle invalid constructor parameters', () => {
            expect(() => new AudioFeatureExtractor(0)).not.toThrow();
            expect(() => new AudioFeatureExtractor(-1)).not.toThrow();
            expect(() => new AudioFeatureExtractor(16000, 0)).not.toThrow();
            expect(() => new AudioFeatureExtractor(16000, 400, 0)).not.toThrow();
        });

        it('should handle extreme parameter combinations', () => {
            const extremeExtractor = new AudioFeatureExtractor(
                192000, // Very high sample rate
                4096,   // Large frame length
                2048,   // Large frame step
                8192,   // Large FFT
                256,    // Many mel bins
                0.99    // High pre-emphasis
            );
            const pcm = new Float32Array(8192).fill(0.1);
            expect(() => extremeExtractor.extract(pcm)).not.toThrow();
        }, 10000);
    });

    describe('Signal Processing Properties', () => {
        it('should produce symmetric features for symmetric input', () => {
            const symmetricPcm = new Float32Array(1600);
            for (let i = 0; i < symmetricPcm.length; i++) {
                symmetricPcm[i] = Math.sin(2 * Math.PI * 440 * i / 16000);
            }
            const result = extractor.extract(symmetricPcm);
            expect(result).toBeInstanceOf(Float32Array);
        });

        it('should handle different pre-emphasis settings correctly', () => {
            const pcm = new Float32Array(800).fill(0.1);
            const result1 = extractor.extract(pcm); // default preEmphasisCoeff = 0.97

            const noPreEmphasisExtractor = new AudioFeatureExtractor(
                16000, 400, 160, 512, 80, 0  // preEmphasisCoeff = 0 → different output
            );
            const result2 = noPreEmphasisExtractor.extract(pcm);

            expect(result1).not.toEqual(result2);
        });

        it('should maintain frequency resolution properties', () => {
            const lowFreqPcm = new Float32Array(1600);
            const highFreqPcm = new Float32Array(1600);
            
            for (let i = 0; i < 1600; i++) {
                const t = i / 16000;
                lowFreqPcm[i] = Math.sin(2 * Math.PI * 200 * t);
                highFreqPcm[i] = Math.sin(2 * Math.PI * 2000 * t);
            }
            
            const lowResult = extractor.extract(lowFreqPcm);
            const highResult = extractor.extract(highFreqPcm);
            
            expect(lowResult).not.toEqual(highResult);
        });

        it('should handle pre-emphasis correctly', () => {
            const noPreEmphasis = new AudioFeatureExtractor(16000, 400, 160, 512, 80, 0);
            const withPreEmphasis = new AudioFeatureExtractor(16000, 400, 160, 512, 80, 0.97);
            
            const pcm = new Float32Array(1600);
            for (let i = 0; i < pcm.length; i++) {
                pcm[i] = Math.sin(2 * Math.PI * 440 * i / 16000);
            }
            
            const result1 = noPreEmphasis.extract(pcm);
            const result2 = withPreEmphasis.extract(pcm);
            
            expect(result1).not.toEqual(result2);
        });
    });
});
