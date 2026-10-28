/**
 * Central re-export of all custom repository classes.
 * MikroORM resolves them via the entity schemas' `repository: () => XRepository` declaration.
 * Add a re-export here when you add a new custom repository.
 */

export { EncounterRepository } from './EncounterRepository';
export { QueueItemRepository } from './QueueItemRepository';
export { TherapistRepository } from './TherapistRepository';
