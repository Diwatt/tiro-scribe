import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';
import { ToneColor } from '@/theme/ToneColor';

describe('ToneColor', () => {
    it('maps accent to the soft accent ground', () => {
        expect(ToneColor.of(Tone.Accent)).toEqual(expect.objectContaining({ background: PaperInk.ACCENT_SOFT, foreground: PaperInk.ACCENT_DEEP }));
    });

    it('maps danger to the soft danger ground', () => {
        expect(ToneColor.of(Tone.Danger).foreground).toBe(PaperInk.DANGER_INK);
    });

    it('maps ochre to the soft ochre ground', () => {
        expect(ToneColor.of(Tone.Ochre).background).toBe(PaperInk.OCHRE_SOFT);
    });

    it('falls back to the neutral chip', () => {
        expect(ToneColor.of(Tone.Neutral).background).toBe(PaperInk.CHIP);
    });
});
