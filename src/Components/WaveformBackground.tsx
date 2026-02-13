import { colord } from 'colord';
import type React from 'react';
import { useMemo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import Svg, { Path } from 'react-native-svg';
import type { ExtendedTheme } from '../theme/AppTheme';

/**
 * Waveform opacity constants
 */
const WAVEFORM = {
    opacityBase: 0.3,
    opacityIncrement: 0.1,
} as const;

export interface WaveformBackgroundProps {
    style?: ViewStyle;
    /** Base color; defaults to theme secondary (brand taupe) when omitted. */
    color?: string;
}

export function WaveformBackground({ style, color: colorProp }: WaveformBackgroundProps): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const color = colorProp ?? theme.colors.secondary;
    // Virtual dimensions of the SVG canvas
    const width = 300;
    const height = 56;
    const centerY = height / 2; // Central axis of symmetry

    // Generate 3 layers with varied parameters (generator inlined so useMemo has no unstable deps)
    const paths = useMemo(() => {
        const generateSymmetricWavePath = (phaseOffset: number, frequencyMult: number, amplitudeMult: number) => {
            const topPoints: string[] = [];
            const bottomPoints: string[] = [];
            for (let x = 0; x <= width; x += 5) {
                const normalizedX = (x / width) * 2 - 1;
                const envelope = (1 - Math.abs(normalizedX) ** 2) ** 1.5;
                const sine1 = Math.sin(x * 0.03 * frequencyMult + phaseOffset);
                const sine2 = Math.cos(x * 0.07 * frequencyMult + phaseOffset * 1.3);
                const combinedSignal = (sine1 + sine2 * 0.6) / 1.6;
                const maxAmplitude = 24 * amplitudeMult;
                const deltaY = Math.abs(combinedSignal * envelope * maxAmplitude);
                topPoints.push(`L ${x} ${centerY - deltaY}`);
                bottomPoints.unshift(`L ${x} ${centerY + deltaY}`);
            }
            return `M 0 ${centerY} ${topPoints.join(' ')} ${bottomPoints.join(' ')} Z`;
        };
        return [
            generateSymmetricWavePath(0, 1.0, 1.0), // Main wave
            generateSymmetricWavePath(2, 1.2, 0.85), // Secondary wave
            generateSymmetricWavePath(4, 1.5, 0.7), // Background wave
        ];
    }, [centerY]);

    // Convert color to RGB string
    const rgbBase = useMemo(() => {
        try {
            const rgb = colord(color).toRgb();
            return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        } catch {
            // Fallback: manual hex parsing
            const hex = color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `${r}, ${g}, ${b}`;
        }
    }, [color]);
    return (
        <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={[styles.svg, style]}>
            {paths.map((d, index) => (
                <Path key={d} d={d} stroke="none" fill={`rgba(${rgbBase}, ${WAVEFORM.opacityBase + index * WAVEFORM.opacityIncrement})`} />
            ))}
        </Svg>
    );
}

const styles = StyleSheet.create({
    svg: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: -1,
    },
});
