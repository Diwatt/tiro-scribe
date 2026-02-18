/**
 * MSW handlers for tests and storybook.
 * GET /profile-attributes = qualifications, therapyMethods, languages.
 * GET /inference-models = inference model array (look up by capability).
 */

import { http, HttpResponse } from 'msw';
import type { ProfileAttributes, InferenceModel } from '@/Api/generated/Types';
import qualifications from './qualifications.json';
import languages from './languages.json';
import inferenceModels from './inference-models.json';
import therapyMethods from './therapy-methods.json';

const profileAttributes: ProfileAttributes = {
    qualifications: qualifications as ProfileAttributes['qualifications'],
    therapyMethods: therapyMethods as ProfileAttributes['therapyMethods'],
    languages: languages as ProfileAttributes['languages'],
};

export const apiHandlers = [
    http.get('*/api/profile-attributes', () => HttpResponse.json(profileAttributes)),
    http.get('*/api/inference-models', () => HttpResponse.json(inferenceModels as InferenceModel[])),
];
