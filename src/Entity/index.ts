import type { Options } from '@mikro-orm/core';
import { DownloadQueue } from './DownloadQueue';
import { Encounter } from './Encounter';
import { Patient } from './Patient';
import { ProsodyMetrics } from './ProsodyMetrics';
import { QueueItem } from './QueueItem';
import { Therapist } from './Therapist';
import { Transcription } from './Transcription';

/** All MikroORM entity classes, consumed by Database.initialize(). */
export const ENTITY_CLASSES: Options['entities'] = [
    Therapist,
    Encounter,
    Patient,
    QueueItem,
    DownloadQueue,
    Transcription,
    ProsodyMetrics,
];

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
} from './Type';
