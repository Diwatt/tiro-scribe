import { EntityMetadata } from '@/Database/Decorator';
import type { EntityClass } from '@/Database/Type';
import type { MetadataConstructor } from '@/Decorator/Type';
import { DownloadQueue } from './DownloadQueue';
import { Encounter } from './Encounter';
import { Patient } from './Patient';
import { ProsodyMetrics } from './ProsodyMetrics';
import { QueueItem } from './QueueItem';
import { Therapist } from './Therapist';
import { Transcription } from './Transcription';

/**
 * Single source of truth: list of all entity classes.
 * Add new entity classes here when you create them.
 * The system will automatically extract table names from @Entity decorator metadata.
 */
const ENTITY_CLASS_LIST = [
    Therapist,
    Encounter,
    Patient,
    QueueItem,
    DownloadQueue,
    Transcription,
    ProsodyMetrics,
] as const satisfies readonly EntityClass[];

/**
 * Build ENTITY_TABLES dynamically from entity classes.
 * Extracts table names from @Entity decorator metadata at runtime.
 * This eliminates the need to maintain table names separately.
 */
function buildEntityTables(): readonly (readonly [string, EntityClass])[] {
    return ENTITY_CLASS_LIST.map((Entity) => {
        const metadata = EntityMetadata.for(Entity as unknown as MetadataConstructor);
        const tableName = metadata.getTableName();
        return [tableName, Entity] as const;
    });
}

/**
 * Entity tables automatically derived from entity class imports.
 * Table names come from @Entity decorator metadata, eliminating duplicate configuration.
 */
export const ENTITY_TABLES = buildEntityTables() as readonly (readonly [string, EntityClass])[];

/** Entity classes for schema sync; derived from ENTITY_CLASS_LIST. */
export const ENTITY_CLASSES: EntityClass[] = Array.from(ENTITY_CLASS_LIST);

export { DownloadQueue, Encounter, Patient, ProsodyMetrics, QueueItem, Therapist, Transcription };
export { VoiceFrame } from './ProsodyMetrics';
export { Utterance } from './Transcription';
export {
    DetectedSpeakerProfile,
    DownloadQueueStatus,
    EncounterStatus,
    EntityType,
    PipelineStage,
    QueueItemStatus,
    QueueItemType,
} from './Type';
