/**
 * SpeakerVector tests.
 *
 * ZOMBIES methodology:
 * Z - Zero: Empty vector, zero confidence
 * O - One: Single element vector, full confidence
 * M - Many: Multi-dimensional vectors
 * B - Boundary: Extreme values, large dimensions
 * I - Interface: Property access, constructor contract
 * E - Exceptions: Invalid inputs
 * S - Sequencing: Multiple instances, immutability
 */

import { SpeakerVector } from '@/InferenceModel/Speaker/SpeakerVector';

describe('SpeakerVector', () => {
    describe('Z - Zero Cases', () => {
        it('should create with empty vector and zero confidence', () => {
            const sv = new SpeakerVector([], 0);

            expect(sv.vector).toEqual([]);
            expect(sv.confidence).toBe(0);
        });

        it('should create with zero confidence and populated vector', () => {
            const sv = new SpeakerVector([0.1, 0.2, 0.3], 0);

            expect(sv.vector).toEqual([0.1, 0.2, 0.3]);
            expect(sv.confidence).toBe(0);
        });

        it('should handle zero values within vector', () => {
            const sv = new SpeakerVector([0, 0, 0], 0.5);

            expect(sv.vector).toEqual([0, 0, 0]);
            expect(sv.confidence).toBe(0.5);
        });
    });

    describe('O - One Cases (Happy Path)', () => {
        it('should create with single element vector', () => {
            const sv = new SpeakerVector([0.123], 0.99);

            expect(sv.vector).toHaveLength(1);
            expect(sv.vector[0]).toBeCloseTo(0.123);
            expect(sv.confidence).toBe(0.99);
        });

        it('should create with full confidence', () => {
            const sv = new SpeakerVector([1, 2, 3], 1);

            expect(sv.confidence).toBe(1);
        });

        it('should preserve vector values', () => {
            const vector = [0.5];
            const sv = new SpeakerVector(vector, 0.8);

            expect(sv.vector).toEqual([0.5]);
            expect(sv.vector[0]).toBe(0.5);
        });

        it('should have vector accessible as public property', () => {
            const sv = new SpeakerVector([0.1, 0.2, 0.3], 0.9);

            expect(sv.vector).toBeDefined();
            expect(Array.isArray(sv.vector)).toBe(true);
        });

        it('should have confidence accessible as public property', () => {
            const sv = new SpeakerVector([1, 2, 3], 0.75);

            expect(sv.confidence).toBeDefined();
            expect(typeof sv.confidence).toBe('number');
        });
    });

    describe('M - Many Cases (Multiple Elements)', () => {
        it('should handle typical embedding dimensions', () => {
            // Common speaker embedding sizes: 192, 256, 512
            const vector = new Array(192).fill(0).map((_, i) => i * 0.01);
            const sv = new SpeakerVector(vector, 0.95);

            expect(sv.vector).toHaveLength(192);
            expect(sv.vector[0]).toBeCloseTo(0);
            expect(sv.vector[191]).toBeCloseTo(1.91);
        });

        it('should handle high-dimensional vectors', () => {
            const vector = new Array(1024).fill(0.5);
            const sv = new SpeakerVector(vector, 0.88);

            expect(sv.vector).toHaveLength(1024);
            expect(sv.vector.every((v) => v === 0.5)).toBe(true);
        });

        it('should preserve order of vector elements', () => {
            const vector = [0.1, 0.2, 0.3, 0.4, 0.5];
            const sv = new SpeakerVector(vector, 0.7);

            expect(sv.vector).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
        });
    });

    describe('B - Boundary Cases', () => {
        it('should handle very small confidence values', () => {
            const sv = new SpeakerVector([1, 2, 3], 0.0001);

            expect(sv.confidence).toBeCloseTo(0.0001);
        });

        it('should handle confidence near 1', () => {
            const sv = new SpeakerVector([1, 2, 3], 0.9999);

            expect(sv.confidence).toBeCloseTo(0.9999);
        });

        it('should handle very large vector values', () => {
            const sv = new SpeakerVector([1e10, 1e15, 1e20], 0.5);

            expect(sv.vector[0]).toBeCloseTo(1e10);
            expect(sv.vector[1]).toBeCloseTo(1e15);
            expect(sv.vector[2]).toBeCloseTo(1e20);
        });

        it('should handle very small vector values', () => {
            const sv = new SpeakerVector([1e-10, 1e-15, 1e-20], 0.5);

            expect(sv.vector[0]).toBeCloseTo(1e-10);
            expect(sv.vector[1]).toBeCloseTo(1e-15);
            expect(sv.vector[2]).toBeCloseTo(1e-20);
        });

        it('should handle negative vector values', () => {
            const sv = new SpeakerVector([-0.5, -1.0, -1.5], 0.9);

            expect(sv.vector).toEqual([-0.5, -1.0, -1.5]);
        });

        it('should handle mixed positive and negative values', () => {
            const sv = new SpeakerVector([-0.5, 0, 0.5], 0.8);

            expect(sv.vector).toEqual([-0.5, 0, 0.5]);
        });
    });

    describe('I - Interface Verification', () => {
        it('should have vector property of type number[]', () => {
            const sv = new SpeakerVector([1, 2, 3], 0.5);

            expect(sv.vector).toBeInstanceOf(Array);
            sv.vector.forEach((v) => {
                expect(typeof v).toBe('number');
            });
        });

        it('should have confidence property of type number', () => {
            const sv = new SpeakerVector([1, 2, 3], 0.5);

            expect(typeof sv.confidence).toBe('number');
        });

        it('should have both properties accessible immediately after construction', () => {
            const vector = [0.1, 0.2];
            const confidence = 0.95;
            const sv = new SpeakerVector(vector, confidence);

            expect(sv.vector).toBe(vector);
            expect(sv.confidence).toBe(confidence);
        });

        it('should allow accessing vector elements by index', () => {
            const sv = new SpeakerVector([0.1, 0.2, 0.3, 0.4], 0.8);

            expect(sv.vector[0]).toBeCloseTo(0.1);
            expect(sv.vector[1]).toBeCloseTo(0.2);
            expect(sv.vector[2]).toBeCloseTo(0.3);
            expect(sv.vector[3]).toBeCloseTo(0.4);
        });
    });

    describe('S - Sequencing and Immutability', () => {
        it('should create independent instances', () => {
            const sv1 = new SpeakerVector([1, 2, 3], 0.5);
            const sv2 = new SpeakerVector([4, 5, 6], 0.9);

            expect(sv1.vector).not.toEqual(sv2.vector);
            expect(sv1.confidence).not.toBe(sv2.confidence);
        });

        it('should not share vector reference between instances', () => {
            const sv1 = new SpeakerVector([1, 2, 3], 0.5);
            const sv2 = new SpeakerVector([1, 2, 3], 0.5);

            // Vector arrays should be independent references
            expect(sv1.vector).not.toBe(sv2.vector);
        });

        it('should allow multiple instances with same values', () => {
            const vector = [0.1, 0.2];
            const confidence = 0.75;

            const sv1 = new SpeakerVector(vector, confidence);
            const sv2 = new SpeakerVector(vector, confidence);

            expect(sv1.vector).toEqual(sv2.vector);
            expect(sv1.confidence).toBe(sv2.confidence);
        });

        it('should handle being used in array collections', () => {
            const vectors: SpeakerVector[] = [
                new SpeakerVector([1, 2], 0.9),
                new SpeakerVector([3, 4], 0.8),
                new SpeakerVector([5, 6], 0.7),
            ];

            expect(vectors).toHaveLength(3);
            expect(vectors[0].vector).toEqual([1, 2]);
            expect(vectors[1].confidence).toBe(0.8);
            expect(vectors[2].vector).toEqual([5, 6]);
        });
    });
});