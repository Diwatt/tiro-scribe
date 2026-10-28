import { Transcription } from '@/Entity/Transcription';

describe('Transcription (entity)', () => {
    it('applies defaults on construction', () => {
        const transcription = new Transcription({ encounterId: 'e-1' });
        expect(transcription.getUuid()).toHaveLength(36);
        expect(transcription.getUtterances()).toEqual([]);
        expect(transcription.getModelName()).toBe('');
        expect(transcription.getModelVersion()).toBe('');
    });

    it('stores and returns utterances', () => {
        const transcription = new Transcription({ encounterId: 'e-1' });
        const utterances = [{ id: 'u1', startTime: 0, endTime: 1200, text: 'bonjour', speakerLabel: 'P', confidence: 0.97 }];
        transcription.setUtterances(utterances);
        expect(transcription.getUtterances()).toEqual(utterances);
    });
});
