/**
 * AudioProcessingService - Orchestrates the complete audio processing pipeline
 *
 * Data Flow:
 * 1. Microphone -> Raw Audio File
 * 2. Raw Audio File -> Whisper -> Raw Text
 * 3. Raw Text -> AnonymizerService -> Clean Text
 * 4. Raw Audio -> Sherpa -> Biocode
 * 5. Final Payload: { biocode, cleanTranscript, confidence }
 */

import {BiocodeService} from './BiocodeService';
import {AnonymizerService} from './AnonymizerService';
import {AudioProcessingResult, ProcessingPayload} from '../Model/Type';

// Type definitions for whisper.rn (to be implemented with native module)
interface WhisperRNInterface {
    transcribe(audioPath: string): Promise<{
        text: string;
        segments: Array<{start: number; end: number; text: string}>;
    }>;
}

export class AudioProcessingService {
    private whisperRN: WhisperRNInterface | null = null;
    private biocodeService: BiocodeService;
    private anonymizerService: AnonymizerService;

    constructor(
        biocodeService: BiocodeService,
        anonymizerService: AnonymizerService,
    ) {
        this.biocodeService = biocodeService;
        this.anonymizerService = anonymizerService;
    }

    /**
     * Initialize the AudioProcessingService with whisper.rn native module
     * @param whisperModule - The native whisper.rn module instance
     */
    async initialize(whisperModule: WhisperRNInterface): Promise<void> {
        this.whisperRN = whisperModule;
    }

    /**
     * Process audio file through the complete pipeline
     * @param audioPath - Path to the raw audio file
     * @param encounterId - Unique encounter identifier
     * @param sessionStartDate - Start date/time of the encounter for temporal fuzzing
     * @returns Complete processing payload
     */
    async processAudio(
        audioPath: string,
        encounterId: string,
        sessionStartDate: Date,
    ): Promise<ProcessingPayload> {
        if (!this.whisperRN) {
            throw new Error(
                'AudioProcessingService not initialized. Call initialize() first.',
            );
        }

        // Set session start date for temporal fuzzing
        this.anonymizerService.setSessionStartDate(sessionStartDate);

        // Step 1: Transcribe audio using Whisper
        const transcriptionResult = await this.whisperRN.transcribe(audioPath);
        const rawText = transcriptionResult.text;

        // Step 2: Anonymize the transcribed text
        const anonymizationResult =
            await this.anonymizerService.anonymize(rawText);

        // Step 3: Extract biocode from audio
        const biocodeResult = await this.biocodeService.processAudio(audioPath);

        // Step 4: Calculate overall confidence
        const overallConfidence =
            (anonymizationResult.confidence + biocodeResult.confidence) / 2;

        // Step 5: Build final payload
        const payload: ProcessingPayload = {
            biocode: biocodeResult.biocode,
            cleanTranscript: anonymizationResult.cleanText,
            confidence: overallConfidence,
            encounterId,
            timestamp: Date.now(),
        };

        return payload;
    }

    /**
     * Process audio and return detailed result
     * @param audioPath - Path to the raw audio file
     * @param sessionStartDate - Start date/time of the session
     * @returns Detailed audio processing result
     */
    async processAudioDetailed(
        audioPath: string,
        sessionStartDate: Date,
    ): Promise<AudioProcessingResult> {
        if (!this.whisperRN) {
            throw new Error(
                'AudioProcessingService not initialized. Call initialize() first.',
            );
        }

        this.anonymizerService.setSessionStartDate(sessionStartDate);

        // Parallel processing of transcription and biocode extraction
        const [transcriptionResult, biocodeResult] = await Promise.all([
            this.whisperRN.transcribe(audioPath),
            this.biocodeService.processAudio(audioPath),
        ]);

        const rawText = transcriptionResult.text;
        const anonymizationResult =
            await this.anonymizerService.anonymize(rawText);

        return {
            rawText,
            anonymizedText: anonymizationResult.cleanText,
            biocode: biocodeResult.biocode,
            confidence:
                (anonymizationResult.confidence + biocodeResult.confidence) / 2,
        };
    }

    /**
     * Reset services for a new session
     */
    reset(): void {
        this.anonymizerService.reset();
    }
}
