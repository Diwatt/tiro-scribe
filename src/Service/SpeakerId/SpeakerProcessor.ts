import type { Biocode } from './Biocode';
import type { BiocodeFactory } from './BiocodeFactory';
import type { SpeakerEmbedder } from './SpeakerEmbedder';
import type { SpeakerVector } from './SpeakerVector';

/**
 * SpeakerProcessor - High-level service for processing audio and creating biocodes
 *
 * This service combines SpeakerEmbedder (for extracting speaker vectors from audio)
 * and BiocodeFactory (for projecting vectors through therapist's projection matrix)
 * to provide a simple interface: audio path + projection matrix → Biocode
 */
export class SpeakerProcessor {
    constructor(
        private readonly biocodeFactory: BiocodeFactory,
        private readonly speakerEmbedder: SpeakerEmbedder,
    ) {}

    /**
     * Create biocode from an existing speaker vector
     * @param speakerVector - Already extracted speaker vector
     * @param projectionMatrix - Therapist's projection matrix
     * @returns Biocode with projected vector and metadata
     */
    createFromSpeakerVector(speakerVector: SpeakerVector, projectionMatrix: number[][]): Biocode {
        return this.biocodeFactory.create(speakerVector, projectionMatrix);
    }

    /**
     * Extract speaker vector from audio (without projection)
     * Useful for testing or when you need the raw vector
     * @param audioPath - Path to the audio file
     * @returns SpeakerVector with embedding and confidence
     */
    async extractSpeakerVector(audioPath: string): Promise<SpeakerVector> {
        // Load audio file and convert to PCM
        const pcmData = await this.loadAudioFileAsPcm(audioPath);

        // Extract speaker vector using the embedder
        return await this.speakerEmbedder.extract(pcmData);
    }

    /**
     * Process audio file and create a biocode
     * @param audioPath - Path to the audio file
     * @param projectionMatrix - Therapist's projection matrix (from master key)
     * @returns Biocode with projected vector and metadata
     */
    async processAudio(audioPath: string, projectionMatrix: number[][]): Promise<Biocode> {
        // Extract speaker vector from audio
        const speakerVector = await this.extractSpeakerVector(audioPath);

        // Create biocode using the factory
        return this.biocodeFactory.create(speakerVector, projectionMatrix);
    }

    /**
     * Load audio file and convert to PCM Float32Array
     * @param audioPath - Path to the audio file
     * @returns PCM data as Float32Array (16kHz, mono, normalized to [-1,1])
     */
    private async loadAudioFileAsPcm(_audioPath: string): Promise<Float32Array> {
        // For now, this is a simplified implementation
        // In a real implementation, you would:
        // 1. Load the audio file (using a library like 'react-native-fs' or 'expo-av')
        // 2. Decode the audio to PCM (using a library like 'react-native-audio-toolkit')
        // 3. Resample to 16kHz if needed
        // 4. Convert to mono if needed
        // 5. Normalize to [-1, 1] range

        // For testing purposes, we'll create a dummy PCM array
        // This represents 1 second of 16kHz audio
        const sampleRate = 16000;
        const duration = 1; // 1 second
        const samples = Math.floor(sampleRate * duration);

        const pcmData = new Float32Array(samples);

        // Generate a simple test signal (sine wave)
        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            const frequency = 440; // A4 note
            pcmData[i] = 0.5 * Math.sin(2 * Math.PI * frequency * t);
        }

        return pcmData;
    }
}
