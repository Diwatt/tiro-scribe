import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { dot, sqrt } from 'mathjs';

dayjs.extend(utc);

export class Biocode {
    public constructor(
        /** The projected speaker vector. Persist as JSON numeric array. */
        public readonly projectedVector: number[],
        /** Confidence from the speaker extraction model (0–1). */
        public readonly confidence: number,
        /** UTC timestamp of biocode creation. */
        public readonly createdAt: dayjs.Dayjs,
    ) {}

    /**
     * Does this biocode match another within the given threshold?
     * @param other - Biocode to compare against
     * @param threshold - Cosine similarity threshold (default 0.85)
     */
    public matches(other: Biocode, threshold = 0.85): boolean {
        return this.similarityTo(other) >= threshold;
    }

    /**
     * Cosine similarity to another Biocode.
     * @returns similarity score in [-1, 1] (in practice 0–1 for normalized vectors)
     */
    public similarityTo(other: Biocode): number {
        const v1 = this.projectedVector;
        const v2 = other.projectedVector;

        if (v1.length !== v2.length) {
            throw new Error(`Vector length mismatch: ${v1.length} vs ${v2.length}`);
        }

        const dotProduct = dot(v1, v2) as number;
        const mag1 = sqrt(dot(v1, v1)) as number;
        const mag2 = sqrt(dot(v2, v2)) as number;

        if (mag1 === 0 || mag2 === 0) {
            return 0;
        }
        return dotProduct / (mag1 * mag2);
    }
}
