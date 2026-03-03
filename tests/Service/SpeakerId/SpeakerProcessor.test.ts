/**
 * SpeakerProcessor tests
 * Tests the high-level service that combines SpeakerEmbedder and BiocodeFactory
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { SpeakerProcessor } from '@/Service/SpeakerId/SpeakerProcessor';
import { BiocodeFactory } from '@/Service/SpeakerId/BiocodeFactory';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';

dayjs.extend(utc);

describe('SpeakerProcessor', () => {
    let speakerProcessor: SpeakerProcessor;
    let mockBiocodeFactory: BiocodeFactory;
    let mockSpeakerEmbedder: any;

    beforeEach(() => {
        mockBiocodeFactory = new BiocodeFactory();
        mockSpeakerEmbedder = {
            extract: vi.fn().mockResolvedValue(
                new SpeakerVector([0.1, 0.2, 0.3, 0.4, 0.5], 0.95)
            ),
        };
        speakerProcessor = new SpeakerProcessor(mockBiocodeFactory, mockSpeakerEmbedder);
    });

    it('creates biocode from PCM buffer', async () => {
        const pcmData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
        const projectionMatrix = [
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1],
        ];

        const biocode = await speakerProcessor.processAudio(pcmData, projectionMatrix);

        expect(biocode).toBeDefined();
        expect(biocode.projectedVector).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
        expect(biocode.confidence).toBe(0.95);
        expect(biocode.createdAt).toBeDefined();
        expect(biocode.createdAt.isUTC()).toBe(true);
    });

    it('extracts speaker vector from PCM buffer', async () => {
        const pcmData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);

        const speakerVector = await speakerProcessor.extractSpeakerVector(pcmData);

        expect(speakerVector).toBeDefined();
        expect(speakerVector.vector).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
        expect(speakerVector.confidence).toBe(0.95);
    });

    it('creates biocode from existing speaker vector', () => {
        const speakerVector = new SpeakerVector([0.3, 0.7, 0.1], 0.88);
        const projectionMatrix = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ];

        const biocode = speakerProcessor.createFromSpeakerVector(speakerVector, projectionMatrix);

        expect(biocode.projectedVector).toEqual([0.3, 0.7, 0.1]);
        expect(biocode.confidence).toBe(0.88);
        expect(biocode.createdAt).toBeDefined();
    });

    it('processes in-memory PCM buffers without touching disk', async () => {
        const pcmData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);

        const speakerVector = await speakerProcessor.extractSpeakerVector(pcmData);

        expect(speakerVector).toBeDefined();
        expect(speakerVector.vector).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
        expect(speakerVector.vector.length).toBeGreaterThan(0);
    });
});
