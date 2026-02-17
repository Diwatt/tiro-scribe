/**
 * MSW handlers for tests and storybook.
 * GET /clinical-attributes = qualifications, therapyMethods, languages.
 * GET /artifacts = model artifacts array (look up by use_case).
 */

import { http, HttpResponse } from 'msw';
import type { ClinicalAttributes } from '@/Api/generated/Types';

const clinicalAttributes: ClinicalAttributes = {
    qualifications: require('./qualifications.json'),
    therapyMethods: require('./therapy-methods.json'),
    languages: require('./languages.json'),
};

/** Artifact configs for GET /artifacts: array, look up by use_case. */
const mockArtifacts = require('./model-artifacts.json') as unknown[];

export const clinicalAttributesHandlers = [
    http.get('*/api/clinical-attributes', () => HttpResponse.json(clinicalAttributes)),
    http.get('*/api/artifacts', () => HttpResponse.json(mockArtifacts)),
];
