/**
 * MSW handlers with real taxonomy data (from JSON files) for tests and storybook.
 * Single GET /taxonomy returns qualifications, therapyMethods, and languages from local JSON.
 */

import type { Taxonomy } from '@/api/generated/models';
import { getGetTaxonomyMockHandler } from '@/api/generated/taxonomy/taxonomy.msw';

const taxonomy: Taxonomy = {
    qualifications: require('./qualifications.json'),
    therapyMethods: require('./therapy-methods.json'),
    languages: require('./languages.json'),
};

export const taxonomyHandlers = [getGetTaxonomyMockHandler(taxonomy)];
