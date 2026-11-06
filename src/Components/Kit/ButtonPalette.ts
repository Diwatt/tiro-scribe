import { PaperInk } from '@/theme/PaperInk';
import { ButtonKind } from './ButtonKind';

/** Colors of a pill button for a given kind. */
export class ButtonPalette {
    private constructor(
        public readonly background: string,
        public readonly text: string,
        public readonly border: string,
    ) {}

    public static of(kind: ButtonKind): ButtonPalette {
        switch (kind) {
            case ButtonKind.Light:
                return new ButtonPalette(PaperInk.NIGHT_TEXT, PaperInk.NIGHT, PaperInk.NIGHT_TEXT);
            case ButtonKind.Outline:
                return new ButtonPalette(PaperInk.CARD, PaperInk.TEXT, PaperInk.LINE_STRONG);
            default:
                return new ButtonPalette(PaperInk.INK, PaperInk.CARD, PaperInk.INK);
        }
    }
}
