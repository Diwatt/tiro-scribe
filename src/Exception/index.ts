/**
 * Exception exports
 * Centralized export point for all exceptions and error types
 */

export { SpeakerVectorExtractionError } from '../InferenceModel/Speaker/SpeakerVectorExtractionError';
export { ApiClientException } from './ApiClientException';
export { DatabaseException, NoActiveTherapistException } from './DatabaseException';
export { EncounterNotFound } from './EncounterNotFound';
export { DecoratorException, MULTIPLE_DECORATORS_NOT_SUPPORTED } from './DecoratorException';
export { FileOperationError } from './FileOperationError';
export { HardwareGuardException } from './HardwareGuardException';
export { InferenceModelDownloaderException } from './InferenceModelDownloaderException';
export { InvalidAudioFormatError } from './InvalidAudioFormatError';
export { InvalidDimensionError } from './InvalidDimensionError';
export { NoActiveRecordingError, RecordingFilePathNotAvailableError } from './NoActiveRecordingError';
export { NoActiveSubscriptionError } from './NoActiveSubscriptionError';
export type { RecordingError } from './RecordingError';
export { RecordingErrorType } from './RecordingErrorType';
export { RecordingPermissionError } from './RecordingPermissionError';
export { RecordingUriUnavailableError } from './RecordingUriUnavailableError';
export { OnnxRuntimeError } from './OnnxRuntimeError';
export { SessionNotInitializedError } from './SessionNotInitializedError';
export { SystemVerifierException } from './SystemVerifierException';
export { TiroScribeException } from './TiroScribeException';
export { TranscriptionNotImplementedError } from './TranscriptionNotImplementedError';
export { VectorLengthMismatchError } from './VectorLengthMismatchError';
