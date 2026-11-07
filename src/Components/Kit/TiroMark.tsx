import type React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { PaperInk } from '@/theme/PaperInk';
import { TiroMarkShape } from './TiroMarkShape';

interface Props {
    size: number;
    ink?: string;
    fill?: string;
    ground?: string;
}

/** The Tiro feather, "sticker" style: thick outline, light body, sound bars inside. */
export function TiroMark({
    size,
    ink = PaperInk.BRAND_INK,
    fill = PaperInk.WHITE,
    ground = PaperInk.BRAND_GROUND,
}: Props): React.JSX.Element {
    return (
        <Svg width={size} height={size} viewBox={TiroMarkShape.VIEW_BOX} accessibilityElementsHidden>
            <G transform={TiroMarkShape.transform()}>
                <Path
                    d={TiroMarkShape.QUILL}
                    fill={ink}
                    stroke={ink}
                    strokeWidth={TiroMarkShape.strokeWidth(1.2, size)}
                    strokeLinejoin="round"
                />
                <Path
                    d={TiroMarkShape.DOWN}
                    stroke={ink}
                    strokeWidth={TiroMarkShape.strokeWidth(2.2, size)}
                    strokeLinecap="round"
                />
                <Path
                    d={TiroMarkShape.BODY}
                    fill={fill}
                    stroke={ink}
                    strokeWidth={TiroMarkShape.strokeWidth(3.2, size)}
                    strokeLinejoin="round"
                />
                {TiroMarkShape.NOTCHES.map((notch) => (
                    <Path key={notch} d={notch} fill={ground} />
                ))}
                {TiroMarkShape.BARS.map(([x, height]) => (
                    <Path
                        key={x}
                        d={TiroMarkShape.barPath(x, height)}
                        stroke={ink}
                        strokeWidth={TiroMarkShape.strokeWidth(2.6, size)}
                        strokeLinecap="round"
                    />
                ))}
            </G>
        </Svg>
    );
}
