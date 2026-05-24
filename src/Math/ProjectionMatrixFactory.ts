/**
 * ProjectionMatrixFactory - Bridge between crypto and linear algebra
 *
 * Takes raw deterministic bytes from CryptoEngine and produces an orthonormal
 * projection matrix for speaker voice identity projection.
 */

import * as math from 'mathjs';
import { AppConfig } from '@/Core/AppConfig';
import { Container } from '@/Core/Container';
import { CryptoEngine } from '../Security/CryptoEngine';

/**
 * ProjectionMatrixFactory creates orthonormal projection matrices from cryptographic keys.
 * Instance-based class that requires CryptoEngine dependency injection.
 */
export class ProjectionMatrixFactory {
    public constructor(
        private readonly crypto: CryptoEngine,
        private readonly projectionSalt: string = 'biocode_projection',
    ) {}

    /**
     * Create an orthonormal projection matrix from a master key
     */
    public create(masterKey: string | null | undefined, inputDim = 192, outputDim = 128): number[][] {
        // Handle null/undefined masterKey gracefully
        const safeKey = masterKey ?? '';
        
        const rows = Math.floor(outputDim);
        const cols = Math.floor(inputDim);
        const flat = this.convertBytesToFloats(safeKey, rows * cols);

        const raw = math.reshape(flat, [rows, cols]);
        const matrix = this.ensure2DArray(raw);

        //return this.orthonormalize(matrix);
        return this.fastNormalize(matrix);
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
     * Fast normalization of rows to unit length.
     * Not a true orthonormalization but sufficient for projection purposes and much faster than QR decomposition.
     * And due to Johnson-Lindenstrauss lemma is should still preserve distances with high probability in high dimensions.
     */
    private fastNormalize(matrix: number[][]): number[][] {
        return matrix.map((row) => {
            let sumSq = 0;
            for (const val of row) {
                sumSq += val * val;
            }
            const mag = Math.sqrt(sumSq) || 1; // || 1 pour éviter la division par zéro
            return row.map((val) => val / mag);
        });
    }
}

Container.register(ProjectionMatrixFactory, () => {
    const appConfig = Container.get(AppConfig);

    return new ProjectionMatrixFactory(new CryptoEngine(), appConfig.projectionSalt);
});
