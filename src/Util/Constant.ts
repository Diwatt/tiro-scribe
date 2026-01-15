/**
 * Application-wide constants
 */

// Model paths are now managed by ModelDownloader
// These are kept for backward compatibility
export const ONNX_MODEL_PATHS = {
    BERT_NER: 'models/bert-ner-quantized.onnx',
    SPEAKER_RECOGNITION: 'models/speaker-recognition.onnx',
} as const;

export const ENTITY_TOKENS = {
    PERSON: '[PERSON]',
    LOCATION: '[LOCATION]',
    FAMILY_RELATION: '[RELATION_FAMILY]',
    WORK_RELATION: '[RELATION_WORK]',
    DATE: '[DATE_FUZZED]',
    TIME: '[TIME_FUZZED]',
} as const;

export const CONFIDENCE_THRESHOLDS = {
    MIN_BIocode: 0.7,
    MIN_ANONYMIZATION: 0.8,
    MIN_OVERALL: 0.75,
} as const;

export const AUDIO_CONFIG = {
    SAMPLE_RATE: 16000,
    CHANNELS: 1,
    BIT_DEPTH: 16,
    FORMAT: 'wav' as const,
} as const;
