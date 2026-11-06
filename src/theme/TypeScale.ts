import type { TextStyle } from 'react-native';
import { PaperInk } from './PaperInk';

/** iOS-like type scale for the V1 interface (system font, large titles). */
export class TypeScale {
    public static readonly BODY: TextStyle = { fontSize: 16, lineHeight: 22, color: PaperInk.TEXT };
    public static readonly CAPTION: TextStyle = { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED };
    public static readonly FOOTNOTE: TextStyle = { fontSize: 12, lineHeight: 16, color: PaperInk.TEXT_MUTED };
    public static readonly HEADLINE: TextStyle = { fontSize: 17, fontWeight: '600', color: PaperInk.TEXT };
    public static readonly LARGE_TITLE: TextStyle = {
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: -0.6,
        color: PaperInk.TEXT,
    };
    public static readonly OVERLINE: TextStyle = {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: PaperInk.TEXT_MUTED,
    };
    public static readonly SUBHEAD: TextStyle = { fontSize: 15, lineHeight: 21, color: PaperInk.TEXT_MUTED };
    public static readonly TIMER: TextStyle = {
        fontSize: 54,
        fontWeight: '300',
        letterSpacing: -1,
        fontVariant: ['tabular-nums'],
        color: PaperInk.WHITE,
    };
    public static readonly TITLE: TextStyle = { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, color: PaperInk.TEXT };
    public static readonly TITLE_SMALL: TextStyle = { fontSize: 20, fontWeight: '700', color: PaperInk.TEXT };
}
