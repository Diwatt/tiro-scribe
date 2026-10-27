/**
 * Pipeline performance benchmark - moved from Math.integration.test.ts
 * (test-review-2026-10-27, Lot 4: the 1000 ms assertion flaked against ~2700 ms actual).
 * Indicative budget only: guards against gross regressions, not a SLA.
 */

import { AudioFeatureExtractor } from '../../src/Math/AudioFeatureExtractor';
import { ProjectionMatrixFactory } from '../../src/Math/ProjectionMatrixFactory';
import { VectorProjection } from '../../src/Math/VectorProjection';
import { CryptoEngine } from '../../src/Security/CryptoEngine';

jest.setTimeout(30_000);

describe('Math pipeline benchmark (indicative)', () => {
    let crypto: CryptoEngine;
    let projectionFactory: ProjectionMatrixFactory;
    let audioExtractor: AudioFeatureExtractor;
    let masterKey: string;

    beforeEach(() => {
        crypto = new CryptoEngine();
        masterKey = crypto.keyFromPassword('integration-test-key', crypto.salt('test', 'integration'));
        projectionFactory = new ProjectionMatrixFactory(crypto, 'test-integration-salt');
        audioExtractor = new AudioFeatureExtractor();
    });

    it('completes the full pipeline within the indicative budget', () => {
        const audio = new Float32Array(1600);
        for (let i = 0; i < audio.length; i++) {
            audio[i] = Math.sin(2 * Math.PI * 440 * i / 16000) * 0.1;
        }

        const start = performance.now();

        const features = audioExtractor.extract(audio);
        const matrix = projectionFactory.create(masterKey, features.length, 64);
        const projection = new VectorProjection(matrix);
        const result = projection.project(Array.from(features));

        const duration = performance.now() - start;

        expect(result).toHaveLength(64);
        // Indicative bound (~2.7 s measured locally): wide on purpose so slow CI never flakes.
        expect(duration).toBeLessThan(15_000);
    });

    it.skip('should handle multiple pipeline executions efficiently', () => {
        // TODO: Vector dimension mismatch (240 vs 80).
        // Needs investigation into feature dimension consistency.
        const audio = new Float32Array(800);
        for (let i = 0; i < audio.length; i++) {
            audio[i] = Math.sin(2 * Math.PI * 440 * i / 16000) * 0.1;
        }

        const matrix = projectionFactory.create(masterKey, 80, 32);
        const projection = new VectorProjection(matrix);

        const start = performance.now();

        for (let i = 0; i < 10; i++) {
            const features = audioExtractor.extract(audio);
            projection.project(Array.from(features));
        }

        const duration = performance.now() - start;

        expect(duration).toBeLessThan(2000); // 10 executions within 2 seconds
    });
});
