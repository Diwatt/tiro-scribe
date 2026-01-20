/**
 * Database Schema Export
 * This file is used by drizzle-kit to generate migrations
 * It only exports table definitions, no runtime dependencies
 */

// Export all table schemas from Entity files
export {queueItemsTable} from '@Entity/QueueItem';
export {therapistsTable} from '@Entity/Therapist';
export {subjectsTable} from '@Entity/Subject';
export {encountersTable} from '@Entity/Encounter';
export {transcriptionSegmentsTable} from '@Entity/TranscriptionSegment';
