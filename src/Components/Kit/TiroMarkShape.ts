/**
 * Geometry of the Tiro mark: a small round bird feather on the 45° diagonal of its tile, its tip curling
 * off-axis, a bevel-cut quill and a tuft of down at the base, holding five symmetric sound bars.
 * Coordinates live in the feather frame (quill base at origin, tip up); the group is rotated and translated
 * so the whole mark is centered in a 64 × 64 box.
 */
export class TiroMarkShape {
    public static readonly ANGLE = 45;
    public static readonly BAR_MIDDLE_Y = -28.5;
    public static readonly BARS: ReadonlyArray<readonly [number, number]> = [
        [-9.6, 8],
        [-4.8, 15],
        [0, 22],
        [4.8, 15],
        [9.6, 8],
    ];
    public static readonly BODY =
        'M0 -4C-14 -8.5 -16 -24 -14 -34C-12.5 -42 -8.5 -48 -8 -54C3 -51 12 -44 14 -34C16 -24 14 -8.5 0 -4Z';
    public static readonly DOWN = 'M0 -4.5L-4.6 -1.2M0 -4.5L4.6 -1.2';
    public static readonly NOTCHES: ReadonlyArray<string> = [
        'M16.8 -31.2L12.4 -27.8L16.4 -24.4Z',
        'M-16.4 -22.6L-12 -19.2L-16 -15.8Z',
    ];
    public static readonly OFFSET_X = 20.42;
    public static readonly OFFSET_Y = 47.35;
    public static readonly QUILL = 'M-1.9 -6L1.9 -6L1.9 5.2L-1.9 12.2Z';
    public static readonly SCALE = 0.84;
    public static readonly VIEW_BOX = '0 0 64 64';

    public static barPath(x: number, height: number): string {
        const top = TiroMarkShape.BAR_MIDDLE_Y - height / 2;

        return `M${x} ${top}V${top + height}`;
    }

    public static strokeWidth(baseWidth: number, size: number): number {
        const smallSizeBoost = size < 32 ? 1.3 : 1;

        return (baseWidth * smallSizeBoost) / TiroMarkShape.SCALE;
    }

    public static transform(): string {
        return `translate(${TiroMarkShape.OFFSET_X} ${TiroMarkShape.OFFSET_Y}) rotate(${TiroMarkShape.ANGLE}) scale(${TiroMarkShape.SCALE})`;
    }
}
