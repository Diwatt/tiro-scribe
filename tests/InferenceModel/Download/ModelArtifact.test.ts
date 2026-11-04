import type { File } from 'expo-file-system';

import { ModelArtifact } from '@/InferenceModel/Download/ModelArtifact';

const makeArtifact = (exists: boolean, text: string): ModelArtifact =>
    new ModelArtifact({ exists, text: async () => text } as unknown as File, 'file:///documents/artifacts/encoder.pte');

describe('ModelArtifact', () => {
    it('reads the file text when it exists on disk', async () => {
        const artifact = makeArtifact(true, 'model: CAMPPlus');

        await expect(artifact.getText()).resolves.toBe('model: CAMPPlus');
    });

    it('returns null text when the file is not on disk', async () => {
        const artifact = makeArtifact(false, 'ignored');

        await expect(artifact.getText()).resolves.toBeNull();
    });

    it('reports whether the file is downloaded', () => {
        expect(makeArtifact(true, 'x').isDownloaded()).toBe(true);
        expect(makeArtifact(false, 'x').isDownloaded()).toBe(false);
    });

    it('returns the resolved uri', () => {
        expect(makeArtifact(true, 'x').getUri()).toBe('file:///documents/artifacts/encoder.pte');
    });
});
