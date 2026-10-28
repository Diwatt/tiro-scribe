import { ProsodyMetrics } from '@/Entity/ProsodyMetrics';

describe('ProsodyMetrics (entity)', () => {
    it('applies defaults on construction', () => {
        const prosody = new ProsodyMetrics({ encounterId: 'e-1' });
        expect(prosody.getUuid()).toHaveLength(36);
        expect(prosody.getVoiceFrames()).toEqual([]);
        expect(prosody.getModelName()).toBe('');
    });

    it('stores and returns voice frames', () => {
        const prosody = new ProsodyMetrics({ encounterId: 'e-1' });
        const frames = [{ startTime: 0, duration: 20, pitch: 120, energy: 0.4, spectralTilt: -3, periodicity: 0.9 }];
        prosody.setVoiceFrames(frames);
        expect(prosody.getVoiceFrames()).toEqual(frames);
    });
});
