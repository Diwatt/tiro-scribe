import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    progress: number;
    color?: string;
    track?: string;
    height?: number;
    label: string;
}

/** Thin determinate progress bar; progress is a ratio between 0 and 1. */
export function ProgressBar({
    progress,
    color = PaperInk.ACCENT,
    track = PaperInk.TRACK,
    height = 6,
    label,
}: Props): React.JSX.Element {
    const ratio = Math.min(1, Math.max(0, progress));

    return (
        <View
            style={[STYLES.track, { height, borderRadius: height / 2, backgroundColor: track }]}
            accessibilityRole="progressbar"
            accessibilityLabel={label}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        >
            <View style={{ width: `${ratio * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
        </View>
    );
}

const STYLES = StyleSheet.create({
    track: { overflow: 'hidden' },
});
