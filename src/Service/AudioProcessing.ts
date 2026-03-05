/**
 * AudioProcessing - Orchestrates the complete audio processing pipeline
 *
 * Data Flow:
 * 1. Microphone -> Raw Audio File
 * 2. Raw Audio File -> ONNX Transcription Model -> Raw Text
 * 3. Raw Text -> Anonymizer -> Clean Text
 * 4. Raw Audio -> ONNX Speaker Model -> BiocodeFactory
 * 5. Final Payload: { biocode, cleanTranscript, confidence }
 */

import type * as Ort from 'onnxruntime-react-native';
import type { SpeakerProcessor } from './SpeakerId/SpeakerProcessor';

async function getOrt(): Promise<typeof Ort> {
    return import('onnxruntime-react-native');
}

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Container } from '@/Container';
import type { LoggerInterface } from '@/Service/Logger';
import { AppLogger } from '@/Service/Logger';
import { TranscriptionNotImplementedError } from '../Exception/TranscriptionNotImplementedError';
import type { Anonymizer } from './Anonymizer';

dayjs.extend(utc);

/** Payload passed through the audio pipeline. timestamp: Dayjs UTC. */
export class ProcessingPayload {
    constructor(
        /** projected biocode vector. */
        public biocode: number[],
        public cleanTranscript: string,
        public confidence: number,
        public encounterUuid: string,
        public timestamp: Dayjs,
    ) {}
}

/** Detailed result from audio processing. */
export class AudioProcessingResult {
    constructor(
        public rawText: string,
        public anonymizedText: string,
        public biocode: number[],
        public confidence: number,
    ) {}
}

/**
 * Transcription constants
 */
const TRANSCRIPTION = {
    NOT_AVAILABLE: '[TRANSCRIPTION_NOT_AVAILABLE]',
} as const;

/**
 * Confidence calculation constants
 */
const CONFIDENCE = {
    AVERAGE_DIVISOR: 2,
} as const;

/**
 * 🚧 WIP: Full ONNX transcription + anonymization orchestration is under active development.
 */
export class AudioProcessing {
    private readonly anonymizerService: Anonymizer;
    private readonly loggerInstance: LoggerInterface;
    private transcriptionSession: Ort.InferenceSession | null = null;

    constructor(
        speakerProcessor: SpeakerProcessor,
        anonymizerService: Anonymizer,
        logger: LoggerInterface = AppLogger.getInstance(),
    ) {
        this.speakerProcessor = speakerProcessor;
        this.anonymizerService = anonymizerService;
        this.loggerInstance = logger;
    }

    /**
     * Initialize the AudioProcessing with ONNX transcription model
     * @param modelPath - Path to the ONNX transcription model (e.g., Whisper converted to ONNX)
     */
    async initialize(modelPath?: string): Promise<void> {
        // For now, transcription is optional
        // You can add a transcription model later or use a different solution
        if (modelPath) {
            try {
                const ort = await getOrt();
                this.transcriptionSession = await ort.InferenceSession.create(modelPath, {
                    executionProviders: ['cpu'],
                });
            } catch (error) {
                this.loggerInstance.warn('Failed to load transcription model:', {
                    error,
                    errorMessage: error instanceof Error ? error.message : String(error),
                });
                // Continue without transcription model - you can implement fallback
            }
        }
    }

    /**
     * Process audio file through the complete pipeline
     * @param audioPath - Path to the raw audio file
     * @param encounterUuid - Unique encounter UUID identifier
     * @param sessionStartDate - Start date/time of the encounter for temporal fuzzing
     * @param projectionMatrix - Therapist's projection matrix for biocode generation
     * @returns Complete processing payload
     */
    async processAudio(
        audioPath: string,
        encounterUuid: string,
        sessionStartDate: Date,
        projectionMatrix: number[][],
    ): Promise<ProcessingPayload> {
        // Set session start date for temporal fuzzing
        this.anonymizerService.setSessionStartDate(sessionStartDate);

        // Step 1: Transcribe audio using ONNX model (if available)
        // TODO: Implement transcription with ONNX Runtime
        // For now, using placeholder - you need to implement transcription
        let rawText = '';

        if (this.transcriptionSession) {
            // TODO: Implement transcription inference
            // rawText = await this.transcribeWithONNX(audioPath);
            throw new TranscriptionNotImplementedError();
        }
        // Fallback: Return empty text or implement alternative transcription
        this.loggerInstance.warn('No transcription model loaded. Skipping transcription step.');
        rawText = TRANSCRIPTION.NOT_AVAILABLE;

        // Step 2: Anonymize the transcribed text
        const anonymizationResult = await this.anonymizerService.anonymize(rawText);

        // Step 3: Extract biocode from audio
        const biocode = await this.speakerProcessor.processAudio(audioPath, projectionMatrix);

        // Step 4: Calculate overall confidence
        const overallConfidence = (anonymizationResult.confidence + biocode.confidence) / CONFIDENCE.AVERAGE_DIVISOR;

        // Step 5: Build final payload
        return new ProcessingPayload(
            biocode.projectedVector,
            anonymizationResult.cleanText,
            overallConfidence,
            encounterUuid,
            dayjs.utc(),
        );
    }

    /**
     * Process audio and return detailed result
     * @param audioPath - Path to the raw audio file
     * @param sessionStartDate - Start date/time of the session
     * @param projectionMatrix - Therapist's projection matrix for biocode generation
     * @returns Detailed audio processing result
     */
    async processAudioDetailed(
        audioPath: string,
        sessionStartDate: Date,
        projectionMatrix: number[][],
    ): Promise<AudioProcessingResult> {
        this.anonymizerService.setSessionStartDate(sessionStartDate);

        // Parallel processing of transcription and biocode extraction
        let rawText = '';

        if (this.transcriptionSession) {
            // TODO: Implement transcription
            // rawText = await this.transcribeWithONNX(audioPath);
            rawText = TRANSCRIPTION.NOT_AVAILABLE;
        }

        const biocode = await this.speakerProcessor.processAudio(audioPath, projectionMatrix);
        const anonymizationResult = await this.anonymizerService.anonymize(rawText);
        return new AudioProcessingResult(
            rawText,
            anonymizationResult.cleanText,
            biocode.projectedVector,
            (anonymizationResult.confidence + biocode.confidence) / CONFIDENCE.AVERAGE_DIVISOR,
        );
    }

    /**
     * Reset services for a new session
     */
    reset(): void {
        this.anonymizerService.reset();
    }
}
