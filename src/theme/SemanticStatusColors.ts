import { colord } from 'colord';

export interface StatusColors {
    background: string;
    text: string;
    accent: string;
    iconBackground: string;
    shadowColor: string;
}

/** Derives StatusColors from a semantic primitive hex for light or dark theme. */
export class SemanticStatusColors {
    public constructor(private readonly primitiveHex: string) {}

    public dark(mixWith: string): StatusColors {
        const c = colord(this.primitiveHex);
        return {
            background: c.darken(0.7).toHex(),
            text: c.lighten(0.5).toHex(),
            accent: c.lighten(0.3).toHex(),
            iconBackground: c.mix(mixWith, 0.2).toHex(),
            shadowColor: c.lighten(0.3).toHex(),
        };
    }

    public light(mixWith: string): StatusColors {
        const c = colord(this.primitiveHex);
        return {
            background: this.primitiveHex,
            text: c.darken(0.65).toHex(),
            accent: c.darken(0.65).toHex(),
            iconBackground: c.mix(mixWith, 0.1).toHex(),
            shadowColor: c.darken(0.65).toHex(),
        };
    }
}
