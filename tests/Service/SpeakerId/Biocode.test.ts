/**
 * Biocode tests
 * Tests the Biocode value object and BiocodeFactory
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Biocode } from '@/Service/SpeakerId/Biocode';
import { BiocodeFactory } from '@/Service/SpeakerId/BiocodeFactory';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';

dayjs.extend(utc);

describe('Biocode', () => {
    it('creates a biocode with required properties', () => {
        const projectedVector = [0.1, 0.2, 0.3, 0.4, 0.5];
        const confidence = 0.95;
        const createdAt = dayjs.utc();

        const biocode = new Biocode(projectedVector, confidence, createdAt);

        expect(biocode.projectedVector).toEqual(projectedVector);
        expect(biocode.confidence).toBe(confidence);
        expect(biocode.createdAt).toEqual(createdAt);
    });

    it('calculates similarity correctly', () => {
        const vector1 = [1, 0, 0];
        const vector2 = [1, 0, 0];
        const biocode1 = new Biocode(vector1, 0.9, dayjs.utc());
        const biocode2 = new Biocode(vector2, 0.9, dayjs.utc());

        const similarity = biocode1.similarityTo(biocode2);
        expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('handles orthogonal vectors', () => {
        const vector1 = [1, 0, 0];
        const vector2 = [0, 1, 0];
        const biocode1 = new Biocode(vector1, 0.9, dayjs.utc());
        const biocode2 = new Biocode(vector2, 0.9, dayjs.utc());

        const similarity = biocode1.similarityTo(biocode2);
        expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('matches with default threshold', () => {
        const vector1 = [1, 0, 0];
        const vector2 = [0.9, 0.1, 0];
        const biocode1 = new Biocode(vector1, 0.9, dayjs.utc());
        const biocode2 = new Biocode(vector2, 0.9, dayjs.utc());

        expect(biocode1.matches(biocode2)).toBe(true);
    });

    it('matches with custom threshold', () => {
        const vector1 = [1, 0, 0];
        const vector2 = [0.5, 0.5, 0];
        const biocode1 = new Biocode(vector1, 0.9, dayjs.utc());
        const biocode2 = new Biocode(vector2, 0.9, dayjs.utc());

        expect(biocode1.matches(biocode2, 0.7)).toBe(true);
        expect(biocode1.matches(biocode2, 0.9)).toBe(false);
    });

    it('throws error for vector length mismatch', () => {
        const vector1 = [1, 0, 0];
        const vector2 = [1, 0];
        const biocode1 = new Biocode(vector1, 0.9, dayjs.utc());
        const biocode2 = new Biocode(vector2, 0.9, dayjs.utc());

        expect(() => biocode1.similarityTo(biocode2)).toThrow('Vector length mismatch');
    });

    it('handles zero magnitude vectors', () => {
        const vector1 = [0, 0, 0];
        const vector2 = [1, 0, 0];
        const biocode1 = new Biocode(vector1, 0.9, dayjs.utc());
        const biocode2 = new Biocode(vector2, 0.9, dayjs.utc());

        const similarity = biocode1.similarityTo(biocode2);
        expect(similarity).toBe(0);
    });
});

describe('BiocodeFactory', () => {
    it('creates biocode from speaker vector', () => {
        const factory = new BiocodeFactory();
        const speakerVector = new SpeakerVector([0.1, 0.2, 0.3, 0.4, 0.5], 0.95);
        const projectionMatrix = [
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1],
        ];

        const biocode = factory.create(speakerVector, projectionMatrix);

        expect(biocode.projectedVector).toEqual(speakerVector.vector);
        expect(biocode.confidence).toBe(speakerVector.confidence);
        expect(biocode.createdAt).toBeDefined();
        expect(biocode.createdAt.isUTC()).toBe(true);
    });

    it('creates biocode with identity projection', () => {
        const factory = new BiocodeFactory();
        const speakerVector = new SpeakerVector([0.3, 0.7, 0.1], 0.88);
        const projectionMatrix = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ];

        const biocode = factory.create(speakerVector, projectionMatrix);

        expect(biocode.projectedVector).toEqual([0.3, 0.7, 0.1]);
        expect(biocode.confidence).toBe(0.88);
    });
});
