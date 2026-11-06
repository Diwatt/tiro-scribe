import type React from 'react';
import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    children: ReactNode;
    isDark?: boolean;
    isPadded?: boolean;
    style?: StyleProp<ViewStyle>;
}

/** Card surface: warm white with hairline border, or ink for highlighted content. */
export function Panel({ children, isDark = false, isPadded = true, style }: Props): React.JSX.Element {
    return (
        <View style={[STYLES.panel, isDark ? STYLES.dark : STYLES.light, isPadded && STYLES.padded, style]}>
            {children}
        </View>
    );
}

const STYLES = StyleSheet.create({
    dark: { backgroundColor: PaperInk.INK, borderColor: PaperInk.INK },
    light: { backgroundColor: PaperInk.CARD, borderColor: PaperInk.LINE },
    padded: { padding: Metric.GUTTER, gap: 10 },
    panel: { borderRadius: Metric.RADIUS_CARD, borderWidth: 1, overflow: 'hidden' },
});
