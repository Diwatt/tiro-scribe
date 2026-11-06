import { TiroMarkShape } from '@/Components/Kit/TiroMarkShape';

describe('TiroMarkShape', () => {
    it('draws a bar centered on the middle line', () => {
        expect(TiroMarkShape.barPath(0, 22)).toBe('M0 -39.5V-17.5');
    });

    it('keeps bars symmetric around the feather axis', () => {
        const heights = TiroMarkShape.BARS.map(([, height]) => height);
        expect(heights).toEqual([...heights].reverse());
        expect(TiroMarkShape.BARS.map(([x]) => x)).toEqual([-9.6, -4.8, 0, 4.8, 9.6]);
    });

    it('compensates the group scale in stroke widths', () => {
        expect(TiroMarkShape.strokeWidth(2.1, 64)).toBeCloseTo(2.5);
    });

    it('thickens strokes below 32 points', () => {
        expect(TiroMarkShape.strokeWidth(2.1, 24)).toBeCloseTo(3.25);
    });

    it('places the feather on the 45 degree diagonal', () => {
        expect(TiroMarkShape.transform()).toBe('translate(17.61 46.39) rotate(45) scale(0.84)');
    });
});
