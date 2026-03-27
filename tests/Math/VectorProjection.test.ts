/**
 * VectorProjection Tests - ZOMBIE Methodology
 * 
 * Z - Zero: Test zero/empty inputs and edge cases
 * O - One: Test single element/minimal inputs
 * M - Many: Test with multiple elements and typical cases
 * B - Boundaries: Test boundary conditions and limits
 * I - Interfaces: Test public API and contract compliance
 * E - Exceptions: Test error handling and edge cases
 */

import { VectorProjection } from '../../src/Math/VectorProjection';
import { InvalidDimensionError, VectorLengthMismatchError } from '@/Exception';

describe('VectorProjection - ZOMBIE Tests', () => {
    let projection: VectorProjection;
    let testMatrix: number[][];

    beforeEach(() => {
        // Create a simple 2x2 identity matrix for testing
        testMatrix = [
            [1, 0],
            [0, 1]
        ];
        projection = new VectorProjection(testMatrix);
    });

    describe('Z - Zero Tests', () => {
        it('should handle zero vector normalization', () => {
            const zeroVector = [0, 0];
            const result = projection.normalize(zeroVector);
            expect(result).toEqual(zeroVector);
        });

        it('should handle zero vectors in cosine similarity', () => {
            const v1 = [0, 0];
            const v2 = [1, 0];
            const result = projection.cosineSimilarity(v1, v2);
            expect(result).toBe(0);
        });

        it('should handle both zero vectors in cosine similarity', () => {
            const v1 = [0, 0];
            const v2 = [0, 0];
            const result = projection.cosineSimilarity(v1, v2);
            expect(result).toBe(0);
        });

        it('should create projection with zero matrix', () => {
            const zeroMatrix = [[0, 0], [0, 0]];
            const zeroProjection = new VectorProjection(zeroMatrix);
            const input = [1, 1];
            const result = zeroProjection.project(input);
            expect(result).toEqual([0, 0]);
        });
    });

    describe('O - One Tests', () => {
        it('should handle single element vectors', () => {
            const singleMatrix = [[1]];
            const singleProjection = new VectorProjection(singleMatrix);
            const result = singleProjection.project([5]);
            expect(result).toEqual([5]);
        });

        it('should normalize unit vector', () => {
            const unitVector = [1, 0];
            const result = projection.normalize(unitVector);
            expect(result).toEqual([1, 0]);
        });

        it('should handle 1xN projection matrix', () => {
            const singleRowMatrix = [[1, 0, 0]];
            const singleRowProjection = new VectorProjection(singleRowMatrix);
            const input = [5, 3, 2];
            const result = singleRowProjection.project(input);
            expect(result).toEqual([5]);
        });

        it('should calculate cosine similarity of identical vectors', () => {
            const v = [1, 0];
            const result = projection.cosineSimilarity(v, v);
            expect(result).toBeCloseTo(1, 10);
        });
    });

    describe('M - Many Tests', () => {
        it('should project multiple vectors correctly', () => {
            const vectors = [
                [1, 2],
                [3, 4],
                [0.5, -1.5]
            ];
            
            const results = vectors.map(v => projection.project(v));
            results.forEach((result, i) => {
                expect(result).toHaveLength(2);
                expect(result[0]).toBeCloseTo(vectors[i][0], 10);
                expect(result[1]).toBeCloseTo(vectors[i][1], 10);
            });
        });

        it('should normalize multiple vectors', () => {
            const vectors = [
                [3, 4], // length 5
                [5, 12], // length 13
                [1, 1] // length sqrt(2)
            ];
            
            const results = vectors.map(v => projection.normalize(v));
            expect(results[0][0]).toBeCloseTo(0.6, 10);
            expect(results[0][1]).toBeCloseTo(0.8, 10);
            expect(results[1][0]).toBeCloseTo(5/13, 10);
            expect(results[1][1]).toBeCloseTo(12/13, 10);
            expect(results[2][0]).toBeCloseTo(1/Math.sqrt(2), 10);
            expect(results[2][1]).toBeCloseTo(1/Math.sqrt(2), 10);
        });

        it('should calculate cosine similarities for multiple vector pairs', () => {
            const v1 = [1, 0];
            const v2 = [0, 1];
            const v3 = [1, 1];
            
            expect(projection.cosineSimilarity(v1, v2)).toBeCloseTo(0, 10);
            expect(projection.cosineSimilarity(v1, v3)).toBeCloseTo(1/Math.sqrt(2), 10);
            expect(projection.cosineSimilarity(v2, v3)).toBeCloseTo(1/Math.sqrt(2), 10);
        });

        it('should handle large projection matrices', () => {
            const largeMatrix = Array.from({ length: 10 }, (_, i) => 
                Array.from({ length: 5 }, (_, j) => i === j ? 1 : 0)
            );
            const largeProjection = new VectorProjection(largeMatrix);
            const input = [1, 2, 3, 4, 5];
            const result = largeProjection.project(input);
            expect(result).toEqual([1, 2, 3, 4, 5, 0, 0, 0, 0, 0]);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should handle very small vectors', () => {
            const tinyVector = [1e-10, 1e-10];
            const result = projection.normalize(tinyVector);
            expect(result[0]).toBeCloseTo(1/Math.sqrt(2), 10);
            expect(result[1]).toBeCloseTo(1/Math.sqrt(2), 10);
        });

        it('should handle very large vectors', () => {
            const largeVector = [1e10, 1e10];
            const result = projection.normalize(largeVector);
            expect(result[0]).toBeCloseTo(1/Math.sqrt(2), 10);
            expect(result[1]).toBeCloseTo(1/Math.sqrt(2), 10);
        });

        it('should handle vectors with mixed positive and negative values', () => {
            const mixedVector = [-3, 4];
            const result = projection.normalize(mixedVector);
            expect(result[0]).toBeCloseTo(-0.6, 10);
            expect(result[1]).toBeCloseTo(0.8, 10);
        });

        it('should handle near-zero magnitude vectors', () => {
            const nearZero = [1e-15, 1e-15];
            const result = projection.normalize(nearZero);
            expect(result[0]).toBeCloseTo(1/Math.sqrt(2), 10);
            expect(result[1]).toBeCloseTo(1/Math.sqrt(2), 10);
        });

        it('should handle maximum practical dimensions', () => {
            const maxMatrix = Array.from({ length: 100 }, (_, i) => 
                Array.from({ length: 100 }, (_, j) => i === j ? 1 : 0)
            );
            const maxProjection = new VectorProjection(maxMatrix);
            const input = Array.from({ length: 100 }, (_, i) => i + 1);
            const result = maxProjection.project(input);
            expect(result).toEqual(input);
        });
    });

    describe('I - Interface Tests', () => {
        it('should maintain projection matrix immutability', () => {
            const originalMatrix = JSON.parse(JSON.stringify(testMatrix));
            projection.project([1, 2]);
            expect(testMatrix).toEqual(originalMatrix);
        });

        it('should return new arrays (no reference sharing)', () => {
            const input = [1, 2];
            const result1 = projection.project(input);
            const result2 = projection.project(input);
            expect(result1).not.toBe(result2);
            expect(result1).toEqual(result2);
        });

        it('should handle Float32Array inputs', () => {
            const floatInput = new Float32Array([1, 2]);
            const result = projection.project(Array.from(floatInput));
            expect(result).toHaveLength(2);
            expect(result[0]).toBeCloseTo(1, 10);
            expect(result[1]).toBeCloseTo(2, 10);
        });

        it('should maintain consistent output types', () => {
            const result = projection.project([1, 2]);
            expect(Array.isArray(result)).toBe(true);
            expect(result.every(x => typeof x === 'number')).toBe(true);
        });

        it('should preserve input vector in normalization', () => {
            const input = [3, 4];
            const original = [...input];
            projection.normalize(input);
            expect(input).toEqual(original);
        });
    });

    describe('E - Exception Tests', () => {
        it('should throw error for empty projection matrix', () => {
            expect(() => new VectorProjection([])).toThrow(InvalidDimensionError);
        });

        it('should handle matrix with empty rows', () => {
            expect(() => new VectorProjection([[]])).not.toThrow();
        });

        it('should throw error for inconsistent matrix dimensions', () => {
            const inconsistentMatrix = [
                [1, 2],
                [3, 4, 5]
            ];
            expect(() => new VectorProjection(inconsistentMatrix)).toThrow(InvalidDimensionError);
        });

        it('should throw error for vector dimension mismatch in projection', () => {
            const wrongDimVector = [1, 2, 3];
            expect(() => projection.project(wrongDimVector)).toThrow(InvalidDimensionError);
        });

        it('should throw error for vector length mismatch in cosine similarity', () => {
            const v1 = [1, 2];
            const v2 = [1, 2, 3];
            expect(() => projection.cosineSimilarity(v1, v2)).toThrow(VectorLengthMismatchError);
        });

        it('should throw error for empty vectors in cosine similarity', () => {
            const v1: number[] = [];
            const v2 = [1, 2];
            expect(() => projection.cosineSimilarity(v1, v2)).toThrow(VectorLengthMismatchError);
        });

        it('should handle NaN values gracefully in normalization', () => {
            const nanVector = [NaN, 1];
            const result = projection.normalize(nanVector);
            expect(isNaN(result[0])).toBe(true);
            expect(isNaN(result[1])).toBe(true);
        });

        it('should handle Infinity values in normalization', () => {
            const infVector = [Infinity, 1];
            const result = projection.normalize(infVector);
            // Check that the result handles Infinity gracefully (either NaN or finite)
            expect(Number.isFinite(result[0]) || Number.isNaN(result[0])).toBe(true);
            expect(Number.isFinite(result[1]) || Number.isNaN(result[1])).toBe(true);
        });
    });

    describe('Mathematical Properties', () => {
        it('should preserve orthonormality properties', () => {
            // Create orthonormal matrix
            const orthonormalMatrix = [
                [1/Math.sqrt(2), 1/Math.sqrt(2)],
                [1/Math.sqrt(2), -1/Math.sqrt(2)]
            ];
            const orthonormalProjection = new VectorProjection(orthonormalMatrix);
            
            const v1 = [1, 0];
            const v2 = [0, 1];
            
            const proj1 = orthonormalProjection.project(v1);
            const proj2 = orthonormalProjection.project(v2);
            
            // Orthogonal vectors should remain orthogonal after projection
            const similarity = orthonormalProjection.cosineSimilarity(proj1, proj2);
            expect(similarity).toBeCloseTo(0, 10);
        });

        it('should maintain vector length ratios in normalization', () => {
            const v1 = [3, 4]; // length 5
            const v2 = [6, 8]; // length 10 (2x v1)
            
            const norm1 = projection.normalize(v1);
            const norm2 = projection.normalize(v2);
            
            // Both should be unit vectors
            const length1 = Math.sqrt(norm1[0]**2 + norm1[1]**2);
            const length2 = Math.sqrt(norm2[0]**2 + norm2[1]**2);
            
            expect(length1).toBeCloseTo(1, 10);
            expect(length2).toBeCloseTo(1, 10);
        });

        it('should satisfy cosine similarity bounds', () => {
            const v1 = [1, 0];
            const v2 = [0, 1];
            const v3 = [1, 1];
            
            const sim12 = projection.cosineSimilarity(v1, v2);
            const sim13 = projection.cosineSimilarity(v1, v3);
            const sim11 = projection.cosineSimilarity(v1, v1);
            
            expect(sim12).toBeGreaterThanOrEqual(-1);
            expect(sim12).toBeLessThanOrEqual(1);
            expect(sim13).toBeGreaterThanOrEqual(-1);
            expect(sim13).toBeLessThanOrEqual(1);
            expect(sim11).toBeCloseTo(1, 10);
        });
    });
});
