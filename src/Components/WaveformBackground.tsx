import { colord } from 'colord';
import type React from 'react';
import { useMemo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Waveform opacity constants
 */
const WAVEFORM = {
    OPACITY_BASE: 0.3,
    OPACITY_INCREMENT: 0.1,
} as const;

export interface WaveformBackgroundProps {
    style?: ViewStyle;
    color?: string; // Base color (e.g. #C5B4A0)
}

export function WaveformBackground({ style, color = '#C5B4A0' }: WaveformBackgroundProps): React.JSX.Element {
    // Virtual dimensions of the SVG canvas
    const width = 300;
    const height = 56;
    const centerY = height / 2; // Central axis of symmetry

    // Function to generate a full, symmetric wave path
    const generateSymmetricWavePath = (phaseOffset: number, frequencyMult: number, amplitudeMult: number) => {
        // Arrays to store upper and lower points
        const topPoints: string[] = [];
        const bottomPoints: string[] = [];

        // Iterate over the width
        for (let x = 0; x <= width; x += 5) {
            // 1. Envelope (bell): quiet at edges, strong at center
            const normalizedX = (x / width) * 2 - 1;
            const envelope = (1 - Math.abs(normalizedX) ** 2) ** 1.5;

            // 2. Signal: sine blend for natural undulation
            const sine1 = Math.sin(x * 0.03 * frequencyMult + phaseOffset);
            const sine2 = Math.cos(x * 0.07 * frequencyMult + phaseOffset * 1.3);
            const combinedSignal = (sine1 + sine2 * 0.6) / 1.6;

            // 3. Offset from center (Delta Y)
            const maxAmplitude = 24 * amplitudeMult; // Max amplitude (slightly less than half the height)
            // Offset is always positive; it's the wave "width" at this point
            const deltaY = Math.abs(combinedSignal * envelope * maxAmplitude);

            // Add points for top and bottom
            topPoints.push(`L ${x} ${centerY - deltaY}`);
            // For bottom, insert at start to build the path in reverse later
            bottomPoints.unshift(`L ${x} ${centerY + deltaY}`);
        }

        // Build final path:
        // 1. Start at center-left
        // 2. Draw top line (left to right)
        // 3. Draw bottom line (right to left)
        // 4. Close the path
        return `M 0 ${centerY} ${topPoints.join(' ')} ${bottomPoints.join(' ')} Z`;
    };

    // Generate 3 layers with varied parameters
    const paths = useMemo(() => {
        return [
            generateSymmetricWavePath(0, 1.0, 1.0), // Main wave
            generateSymmetricWavePath(2, 1.2, 0.85), // Secondary wave
            generateSymmetricWavePath(4, 1.5, 0.7), // Background wave
        ];
    }, []);

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
                <Path
                    key={index}
                    d={d}
                    stroke="none"
                    // Progressive opacity for depth effect
                    fill={`rgba(${rgbBase}, ${WAVEFORM.OPACITY_BASE + index * WAVEFORM.OPACITY_INCREMENT})`}
                />
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
