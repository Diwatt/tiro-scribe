import { PaperInk } from './PaperInk';
import { Tone } from './Tone';

/** Background and foreground pair for a semantic tone. */
export class ToneColor {
    private constructor(
        public readonly background: string,
        public readonly foreground: string,
    ) {}

    public static of(tone: Tone): ToneColor {
        switch (tone) {
            case Tone.Accent:
                return new ToneColor(PaperInk.ACCENT_SOFT, PaperInk.ACCENT_DEEP);
            case Tone.Danger:
                return new ToneColor(PaperInk.DANGER_SOFT, PaperInk.DANGER_INK);
            case Tone.Ochre:
                return new ToneColor(PaperInk.OCHRE_SOFT, PaperInk.OCHRE_INK);
            default:
                return new ToneColor(PaperInk.CHIP, PaperInk.INK);
        }
    }
}
