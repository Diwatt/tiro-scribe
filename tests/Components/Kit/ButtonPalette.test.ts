import { ButtonKind } from '@/Components/Kit/ButtonKind';
import { ButtonPalette } from '@/Components/Kit/ButtonPalette';
import { PaperInk } from '@/theme/PaperInk';

describe('ButtonPalette', () => {
    it('uses ink with card text for primary buttons', () => {
        const palette = ButtonPalette.of(ButtonKind.Primary);
        expect(palette.background).toBe(PaperInk.INK);
        expect(palette.text).toBe(PaperInk.CARD);
    });

    it('uses light ground with night text on dark screens', () => {
        const palette = ButtonPalette.of(ButtonKind.Light);
        expect(palette.background).toBe(PaperInk.NIGHT_TEXT);
        expect(palette.text).toBe(PaperInk.NIGHT);
    });

    it('draws an outline on card for outline buttons', () => {
        const palette = ButtonPalette.of(ButtonKind.Outline);
        expect(palette.background).toBe(PaperInk.CARD);
        expect(palette.border).toBe(PaperInk.LINE_STRONG);
    });
});
