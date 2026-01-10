/**
 * BiocodeService - Voice Identity & Salting
 * 
 * Implements the biocoding protocol:
 * 1. Extract speaker vector using sherpa-onnx
 * 2. Calculate cosine similarity for speaker recognition
 * 3. Apply salting: Hash(SpeakerVector + TherapistID_Salt) = PatientID
 */

import CryptoJS from 'crypto-js';
import { SpeakerVector, BiocodeResult, TherapistSalt } from '../Model/Type';

// Type definitions for sherpa-onnx (to be implemented with native module)
interface SherpaOnnxInterface {
  extractSpeakerVector(audioPath: string): Promise<SpeakerVector>;
  compareVectors(vector1: number[], vector2: number[]): Promise<number>;
}

export class BiocodeService {
  private sherpaOnnx: SherpaOnnxInterface | null = null;
  private therapistSalt: TherapistSalt | null = null;

  /**
   * Initialize the BiocodeService with sherpa-onnx native module
   * @param sherpaOnnxModule - The native sherpa-onnx module instance
   */
  async initialize(sherpaOnnxModule: SherpaOnnxInterface): Promise<void> {
    this.sherpaOnnx = sherpaOnnxModule;
  }

  /**
   * Set the therapist salt for patient ID generation
   * @param therapistId - Unique therapist identifier
   * @param salt - Optional custom salt, otherwise generated from therapistId
   */
  setTherapistSalt(therapistId: string, salt?: string): void {
    this.therapistSalt = {
      therapistId,
      salt: salt || this.generateSaltFromTherapistId(therapistId),
    };
  }

  /**
   * Generate a deterministic salt from therapist ID
   */
  private generateSaltFromTherapistId(therapistId: string): string {
    return CryptoJS.SHA256(`therapist_salt_${therapistId}`).toString();
  }

  /**
   * Extract speaker vector from audio file
   * @param audioPath - Path to the audio file
   * @returns Speaker vector with confidence score
   */
  async extractSpeakerVector(audioPath: string): Promise<SpeakerVector> {
    if (!this.sherpaOnnx) {
      throw new Error('BiocodeService not initialized. Call initialize() first.');
    }

    try {
      const result = await this.sherpaOnnx.extractSpeakerVector(audioPath);
      return result;
    } catch (error) {
      throw new Error(`Failed to extract speaker vector: ${error}`);
    }
  }

  /**
   * Calculate cosine similarity between two speaker vectors
   * @param vector1 - First speaker vector
   * @param vector2 - Second speaker vector
   * @returns Cosine similarity score (0-1)
   */
  async calculateCosineSimilarity(
    vector1: number[],
    vector2: number[]
  ): Promise<number> {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same length');
    }

    if (this.sherpaOnnx?.compareVectors) {
      return await this.sherpaOnnx.compareVectors(vector1, vector2);
    }

    // Fallback: Manual cosine similarity calculation
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Generate patient biocode from speaker vector using salting
   * @param speakerVector - The extracted speaker vector
   * @returns Biocode result with patient ID hash
   */
  async generateBiocode(speakerVector: SpeakerVector): Promise<BiocodeResult> {
    if (!this.therapistSalt) {
      throw new Error(
        'Therapist salt not set. Call setTherapistSalt() first.'
      );
    }

    // Convert vector to string representation
    const vectorString = speakerVector.vector.join(',');

    // Combine vector with therapist salt
    const saltedInput = `${vectorString}_${this.therapistSalt.salt}`;

    // Generate deterministic hash (SHA-256)
    const biocode = CryptoJS.SHA256(saltedInput).toString();

    return {
      biocode,
      confidence: speakerVector.confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Process audio file and generate biocode
   * @param audioPath - Path to the audio file
   * @returns Biocode result
   */
  async processAudio(audioPath: string): Promise<BiocodeResult> {
    const speakerVector = await this.extractSpeakerVector(audioPath);
    return await this.generateBiocode(speakerVector);
  }

  /**
   * Verify if a speaker vector matches a stored biocode
   * This is used for longitudinal tracking of the same patient
   * @param speakerVector - Current speaker vector
   * @param storedBiocode - Previously stored biocode
   * @param threshold - Similarity threshold (default: 0.85)
   * @returns True if vectors match within threshold
   */
  async verifyBiocode(
    speakerVector: SpeakerVector,
    storedBiocode: string,
    threshold: number = 0.85
  ): Promise<boolean> {
    // Note: This is a simplified verification
    // In production, you'd need to store the original vector or use a different approach
    // since we can't reverse the hash. This would require a database lookup.
    throw new Error(
      'Biocode verification requires stored vector comparison. Implement vector storage in database.'
    );
  }
}
