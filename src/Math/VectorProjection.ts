/**
 * VectorProjection - Immutable linear algebra operations for voice biocode projection
 */

import { dot, multiply, sqrt } from 'mathjs';
import { InvalidDimensionError, VectorLengthMismatchError } from '../Exception';

export class VectorProjection {
    private readonly inputDim: number;

    public constructor(private readonly projectionMatrix: number[][]) {
        // Validate matrix on construction
        if (!projectionMatrix || projectionMatrix.length === 0) {
            throw new InvalidDimensionError('Projection matrix cannot be empty');
        }

        this.inputDim = projectionMatrix[0].length;

        // Check that all rows have the same length
        for (let i = 0; i < projectionMatrix.length; i++) {
            if (projectionMatrix[i].length !== this.inputDim) {
                throw new InvalidDimensionError(
                    `Inconsistent matrix dimensions: row ${i} has length ${projectionMatrix[i].length}, expected ${this.inputDim}`,
                );
            }
        }
    }

    public cosineSimilarity(v1: number[], v2: number[]): number {
        if (v1.length !== v2.length) {
            throw new VectorLengthMismatchError(`Vector lengths don't match: ${v1.length} vs ${v2.length}`);
        }

        const dotProduct = dot(v1, v2) as number;
        const magnitude1 = sqrt(dot(v1, v1)) as number;
        const magnitude2 = sqrt(dot(v2, v2)) as number;

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        return dotProduct / (magnitude1 * magnitude2);
    }

    public normalize(vector: number[]): number[] {
        const magnitude = sqrt(dot(vector, vector)) as number;
        if (magnitude === 0) {
            return vector;
        }
        return multiply(vector, 1 / magnitude) as number[];
    }

    public project(vector: number[]): number[] {
        if (this.inputDim !== vector.length) {
            throw new InvalidDimensionError(
                `Vector dimension ${vector.length} does not match projection matrix input dimension ${this.inputDim}`,
            );
        }

        // Single matrix-vector multiply — replaces manual row-by-row loop
        return multiply(this.projectionMatrix, vector);
    }
}
