/**
 * Central re-export of all custom repository classes.
 * Used by Registry to resolve @Entity({ repositoryClass: '...' }) without dynamic import.
 * Add a re-export here when you add a new custom repository.
 */

export { EncounterRepository } from './EncounterRepository';
export { TherapistRepository } from './TherapistRepository';
