import type { ModelConfig } from '@/Api';
import type { AppConfig } from '@/Core/AppConfig';
import type { AppLogger } from '@/Core/AppLogger';
import { ModelArtifactStorage } from '@/InferenceModel/Download/ModelArtifactStorage';
import { InferenceModelDownloaderException } from '@/Exception';

jest.mock('expo-file-system', () => ({}));

const onnxFile = { url: 'https://example.com/speaker_id/voxceleb.onnx', hash: 'onnx1', sizeBytes: 100 };
const yamlFile = { url: 'https://example.com/speaker_id/config.yaml', hash: 'yaml1', sizeBytes: 200 };

const legacyConfig: ModelConfig = {
    capability: 'speaker_id',
    id: 'voxceleb-campp',
    version: '1.0.0',
    files: [onnxFile, yamlFile],
    minAppVersion: '1.0.0',
};

const roleConfig: ModelConfig = {
    capability: 'speaker_id',
    id: 'voxceleb-campp',
    version: '1.0.0',
    files: [
        { url: onnxFile.url, hash: onnxFile.hash, sizeBytes: onnxFile.sizeBytes, role: 'model' },
        { url: yamlFile.url, hash: yamlFile.hash, sizeBytes: yamlFile.sizeBytes, role: 'config' },
    ],
    minAppVersion: '1.0.0',
};

const createStorage = (): ModelArtifactStorage =>
    new ModelArtifactStorage(
        { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as AppLogger,
        {} as AppConfig,
    );

describe('ModelArtifactStorage.getFileByRole', () => {
    it('returns the file declared with the requested role', () => {
        const file = createStorage().getFileByRole(roleConfig, 'config');

        expect(file).toEqual(roleConfig.files[1]);
    });

    it('falls back to the first file for role model on legacy payloads without roles', () => {
        const file = createStorage().getFileByRole(legacyConfig, 'model');

        expect(file).toEqual(legacyConfig.files[0]);
    });

    it('falls back to the first file for role model when roles exist but model is undeclared', () => {
        const config: ModelConfig = {
            ...roleConfig,
            files: [{ url: onnxFile.url, hash: onnxFile.hash, sizeBytes: onnxFile.sizeBytes }],
        };

        const file = createStorage().getFileByRole(config, 'model');

        expect(file).toEqual(config.files[0]);
    });

    it('throws when the requested role is not declared in the bundle', () => {
        expect(() => createStorage().getFileByRole(roleConfig, 'tokenizer')).toThrow(InferenceModelDownloaderException);
        expect(() => createStorage().getFileByRole(roleConfig, 'tokenizer')).toThrow(/role 'tokenizer'/);
    });

    it('throws when the model configuration has no files', () => {
        const emptyConfig: ModelConfig = { ...legacyConfig, files: [] };

        expect(() => createStorage().getFileByRole(emptyConfig, 'model')).toThrow(InferenceModelDownloaderException);
        expect(() => createStorage().getFileByRole(emptyConfig, 'model')).toThrow(/has no files/);
    });
});
