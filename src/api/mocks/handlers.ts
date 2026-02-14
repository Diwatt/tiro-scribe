/**
 * MSW handlers for tests and storybook.
 * GET /taxonomy = qualifications, therapyMethods, languages.
 * GET /models = model config map (use_case -> ModelConfig).
 */

import type { ModelConfigMap, Taxonomy } from '@/api/generated/models';
import { getGetModelsMockHandler } from '@/api/generated/models/models.msw';
import { getGetTaxonomyMockHandler } from '@/api/generated/taxonomy/taxonomy.msw';

const taxonomy: Taxonomy = {
    qualifications: require('./qualifications.json'),
    therapyMethods: require('./therapy-methods.json'),
    languages: require('./languages.json'),
};

const mockModels: Record<string, unknown> = {
    speaker_id: {
        id: 'cam-pp-voxceleb-en-16k',
        use_case: 'speaker_id',
        version: '1.0.0',
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/wespeaker_en_voxceleb_CAM++.onnx',
        hash: 'sha256:',
        size_bytes: 29_000_000,
        min_app_version: '0.0.0',
    },
    vad: {
        id: 'vad-default',
        use_case: 'vad',
        version: '1.0.0',
        url: 'https://example.com/models/vad.onnx',
        hash: 'sha256:',
        size_bytes: 0,
        min_app_version: '0.0.0',
    },
};

export const taxonomyHandlers = [
    getGetTaxonomyMockHandler(taxonomy),
    getGetModelsMockHandler(mockModels as ModelConfigMap),
];
