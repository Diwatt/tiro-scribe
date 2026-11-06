/**
 * Geometry of the Tiro mark: a small round feather on the 45° diagonal of its tile,
 * holding five symmetric sound bars. Coordinates live in the feather frame (stem at origin, tip up),
 * then the group is rotated and translated so the whole mark is centered in a 64 × 64 box.
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
        'M0 -4C-14 -8.5 -16 -24 -14 -34C-12 -43.5 -5 -50 0 -51.5C5 -50 12 -43.5 14 -34C16 -24 14 -8.5 0 -4Z';
    public static readonly NOTCHES: ReadonlyArray<string> = [
        'M16.8 -31.2L12.4 -27.8L16.4 -24.4Z',
        'M-16.4 -22.6L-12 -19.2L-16 -15.8Z',
    ];
    public static readonly OFFSET_X = 17.61;
    public static readonly OFFSET_Y = 46.39;
    public static readonly SCALE = 0.84;
    public static readonly STEM = 'M0 -5L0 5.5';
    public static readonly TUFT = 'M0 -2L-3.4 0.6M0 -2L3.4 0.6';
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
