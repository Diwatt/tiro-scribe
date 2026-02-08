/**
 * AudioPipelineAdapter
 * Adapter to connect Queue with AudioProcessing
 */

import type { ProcessingPayload } from '@/Entity';
import { InvalidAudioFormatError } from '../Exception/InvalidAudioFormatError';
import type { AudioProcessing } from './AudioProcessing';
import { AppLogger, type LoggerInterface } from './Logger';

/**
 * Adapter interface that QueueService expects
 */
export interface AudioPipeline {
    process(filePath: string): Promise<void>;
}

/**
 * Adapter implementation that wraps AudioProcessing
 * This adapter converts AudioProcessing.processAudio() to the simpler
 * process() interface expected by Queue
 */
export class AudioPipelineAdapter implements AudioPipeline {
    private audioProcessingService: AudioProcessing;
    private encounterUuid: string;
    private sessionStartDate: Date;
    private loggerInstance: LoggerInterface;

    constructor(audioProcessingService: AudioProcessing, encounterUuid: string, sessionStartDate: Date, logger: LoggerInterface = AppLogger.getInstance()) {
        this.audioProcessingService = audioProcessingService;
        this.encounterUuid = encounterUuid;
        this.sessionStartDate = sessionStartDate;
        this.loggerInstance = logger;
    }

    /**
     * Process audio file
     * This method is called by Queue for each queue item
     * @param filePath - Path to the audio file
     */
    async process(filePath: string): Promise<void> {
        // Process the audio and get the payload
        const payload: ProcessingPayload = await this.audioProcessingService.processAudio(filePath, this.encounterUuid, this.sessionStartDate);

        // TODO: Save the payload to the recordings table or sync_queue
        // For now, we just process it - the actual storage can be handled elsewhere
        this.loggerInstance.info('Audio processed successfully:', {
            encounterUuid: this.encounterUuid,
            payload,
        });
    }
}

/**
 * Mock AudioPipeline for testing/development
 * Use this when AudioProcessing is not yet initialized
 */
export class MockAudioPipeline implements AudioPipeline {
    private loggerInstance: LoggerInterface;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.loggerInstance = logger;
    }

    async process(filePath: string): Promise<void> {
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.loggerInstance.debug('Mock: Processing audio file:', {
            filePath,
        });
        // Simulate random failures (10% failure rate)
        if (Math.random() < 0.1) {
            throw new InvalidAudioFormatError('Mock processing error');
        }
    }
}
