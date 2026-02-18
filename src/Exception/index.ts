/**
 * Exception exports
 * Centralized export point for all exceptions and error types
 */

export { ApiClientException } from './ApiClientException';
export { InferenceModelDownloaderException } from './InferenceModelDownloaderException';
export { DatabaseException } from './DatabaseException';
export { DecoratorException, MULTIPLE_DECORATORS_NOT_SUPPORTED } from './DecoratorException';
export { FileOperationError } from './FileOperationError';
export { HardwareGuardException } from './HardwareGuardException';
export { InvalidAudioFormatError } from './InvalidAudioFormatError';
export { InvalidDimensionError } from './InvalidDimensionError';
export { NoActiveRecordingError } from './NoActiveRecordingError';
export { RecorderNotInitializedError } from './RecorderNotInitializedError';
export type { RecordingError } from './RecordingError';
export { RecordingErrorType } from './RecordingErrorType';
export { RecordingPermissionError } from './RecordingPermissionError';
export { RecordingUriUnavailableError } from './RecordingUriUnavailableError';
export { SessionNotInitializedError } from './SessionNotInitializedError';
export { SpeakerVectorExtractionError } from './SpeakerVectorExtractionError';
export { TiroScribeException } from './TiroScribeException';
export { TranscriptionNotImplementedError } from './TranscriptionNotImplementedError';
export { VectorLengthMismatchError } from './VectorLengthMismatchError';
