/**
 * AudioPipelineAdapter
 * Adapter to connect QueueService with AudioProcessingService
 */

import {AudioProcessingService} from './AudioProcessingService';
import {ProcessingPayload} from '@Model/Type';

/**
 * Adapter interface that QueueService expects
 */
export interface AudioPipeline {
    process(filePath: string): Promise<void>;
}

/**
 * Adapter implementation that wraps AudioProcessingService
 * This adapter converts AudioProcessingService.processAudio() to the simpler
 * process() interface expected by QueueService
 */
export class AudioPipelineAdapter implements AudioPipeline {
    private audioProcessingService: AudioProcessingService;
    private encounterId: string;
    private sessionStartDate: Date;

    constructor(
        audioProcessingService: AudioProcessingService,
        encounterId: string,
        sessionStartDate: Date,
    ) {
        this.audioProcessingService = audioProcessingService;
        this.encounterId = encounterId;
        this.sessionStartDate = sessionStartDate;
    }

    /**
     * Process audio file
     * This method is called by QueueService for each queue item
     * @param filePath - Path to the audio file
     */
    async process(filePath: string): Promise<void> {
        // Process the audio and get the payload
        const payload: ProcessingPayload =
            await this.audioProcessingService.processAudio(
                filePath,
                this.encounterId,
                this.sessionStartDate,
            );

        // TODO: Save the payload to the recordings table or sync_queue
        // For now, we just process it - the actual storage can be handled elsewhere
        console.log('Audio processed successfully:', payload);
    }
}

/**
 * Mock AudioPipeline for testing/development
 * Use this when AudioProcessingService is not yet initialized
 */
export class MockAudioPipeline implements AudioPipeline {
    async process(filePath: string): Promise<void> {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Mock: Processing audio file:', filePath);
        // Simulate random failures (10% failure rate)
        if (Math.random() < 0.1) {
            throw new Error('Mock processing error');
        }
    }
}
