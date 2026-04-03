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
    public constructor(
        private readonly biocodeFactory: BiocodeFactory,
        private readonly speakerEmbedder: SpeakerEmbedder,
    ) {}

    /**
     * Create biocode from an existing speaker vector
     * @param speakerVector - Already extracted speaker vector
     * @param projectionMatrix - Therapist's projection matrix
     * @returns Biocode with projected vector and metadata
     */
    public createFromSpeakerVector(speakerVector: SpeakerVector, projectionMatrix: number[][]): Biocode {
        return this.biocodeFactory.create(speakerVector, projectionMatrix);
    }

    /**
     * Extract speaker vector from in-memory PCM (without projection)
     * Useful for testing or when you need the raw vector
     * @param pcm - PCM data captured entirely in memory
     * @returns SpeakerVector with embedding and confidence
     */
    public async extractSpeakerVector(pcm: Float32Array): Promise<SpeakerVector> {
        return await this.speakerEmbedder.extract(pcm);
    }

    /**
     * Process in-memory PCM audio and create a biocode
     * @param pcm - PCM data captured entirely in memory
     * @param projectionMatrix - Therapist's projection matrix (from master key)
     * @returns Biocode with projected vector and metadata
     */
    public async processAudio(pcm: Float32Array, projectionMatrix: number[][]): Promise<Biocode> {
        const speakerVector = await this.extractSpeakerVector(pcm);
        return this.biocodeFactory.create(speakerVector, projectionMatrix);
    }
}
