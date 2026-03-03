/**
 * ProjectionMatrixFactory - Bridge between crypto and linear algebra
 *
 * Takes raw deterministic bytes from CryptoEngine and produces an orthonormal
 * projection matrix for speaker voice identity projection.
 */

import { qr, reshape, transpose } from 'mathjs';
import { AppConfig } from '../Config';
import type { CryptoEngine } from '../Security/CryptoEngine';

/**
 * ProjectionMatrixFactory creates orthonormal projection matrices from cryptographic keys.
 * Instance-based class that requires CryptoEngine dependency injection.
 */
export class ProjectionMatrixFactory {
    public constructor(
        private readonly crypto: CryptoEngine,
        private readonly projectionSalt: string = AppConfig.projectionSalt,
    ) {}

    /**
     * Create an orthonormal projection matrix from a master key
     */
    public create(masterKey: string, inputDim = 192, outputDim = 128): number[][] {
        const rows = Math.floor(outputDim);
        const cols = Math.floor(inputDim);
        const flat = this.convertBytesToFloats(masterKey, rows * cols);

        const raw = reshape(flat, [rows, cols]);
        const matrix = this.ensure2DArray(raw);

        return this.orthonormalize(matrix);
    }

    /**
     * Convert deterministic bytes to float array in [-1, 1]
     */
    private convertBytesToFloats(masterKey: string, floatCount: number): number[] {
        const count = Math.ceil(floatCount);
        const byteLength = count * 4;
        const randomBytes = this.crypto.generateDeterministicBytes(masterKey, this.projectionSalt, byteLength);

        // Ensure we have enough bytes
        if (randomBytes.length < byteLength) {
            throw new Error(`Insufficient bytes: expected ${byteLength}, got ${randomBytes.length}`);
        }

        const result: number[] = [];
        let offset = 0;
        for (let i = 0; i < count; i++) {
            const uint = randomBytes.readUInt32LE(offset);
            offset += 4;
            result.push((uint / 0xffffffff) * 2 - 1);
        }
        return result;
    }

    /**
     * Ensure the result is a 2D number array
     */
    private ensure2DArray(raw: unknown): number[][] {
        if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
            return raw as number[][];
        }
        return (raw as { toArray(): number[][] }).toArray();
    }

    /**
     * Orthonormalize matrix using QR decomposition (Householder reflections)
     * More numerically stable than classical Gram-Schmidt
     */
    private orthonormalize(matrix: number[][]): number[][] {
        const rows = matrix.length;
        const cols = matrix[0].length;

        const mt = transpose(matrix);
        const decomposition = qr(mt);

        const q = this.ensure2DArray(decomposition.Q);

        const result: number[][] = [];
        for (let i = 0; i < rows; i++) {
            result[i] = new Array(cols);
            for (let j = 0; j < cols; j++) {
                result[i][j] = q[j][i];
            }
        }
        return result;
    }
}
