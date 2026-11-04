/**
 * Exception exports
 * Centralized export point for all exceptions and error types
 */

export { SpeakerVectorExtractionError } from '../InferenceModel/Speaker/SpeakerVectorExtractionError';
export { ApiClientException } from './ApiClientException';
export { AsrException } from './AsrException';
export { DatabaseException, NoActiveTherapistException } from './DatabaseException';
export { DecoratorException, MULTIPLE_DECORATORS_NOT_SUPPORTED } from './DecoratorException';
export { DependencyResolutionException } from './DependencyResolutionException';
export { EncounterNotFound } from './EncounterNotFound';
export { ExecuTorchException } from './ExecuTorchException';
export { FileOperationError } from './FileOperationError';
export { HardwareGuardException } from './HardwareGuardException';
export { InferenceModelDownloaderException } from './InferenceModelDownloaderException';
export { InvalidAudioFormatError } from './InvalidAudioFormatError';
export { InvalidAudioParametersException } from './InvalidAudioParametersException';
export { InvalidDimensionError } from './InvalidDimensionError';
export { InvalidMasterKeyException } from './InvalidMasterKeyException';
export { NoActiveRecordingError, RecordingFilePathNotAvailableError } from './NoActiveRecordingError';
export { NoActiveSubscriptionError } from './NoActiveSubscriptionError';
export type { RecordingError } from './RecordingError';
export { RecordingErrorType } from './RecordingErrorType';
export { RecordingPermissionError } from './RecordingPermissionError';
export { RecordingUriUnavailableError } from './RecordingUriUnavailableError';
export { SpeakerIdException } from './SpeakerIdException';
export { SystemVerifierException } from './SystemVerifierException';
export { TiroScribeException } from './TiroScribeException';
export { TranscriptionNotImplementedError } from './TranscriptionNotImplementedError';
export { VectorLengthMismatchError } from './VectorLengthMismatchError';
