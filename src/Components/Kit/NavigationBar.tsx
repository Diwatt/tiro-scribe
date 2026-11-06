import { ChevronLeft } from 'lucide-react-native';
import type React from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    backLabel?: string;
    onBack?: () => void;
    trailing?: ReactNode;
}

/** Compact iOS-style bar: back link on the left, round actions on the right. */
export function NavigationBar({ backLabel, onBack, trailing }: Props): React.JSX.Element {
    return (
        <View style={STYLES.bar}>
            {backLabel ? (
                <Pressable onPress={onBack} accessibilityRole="button" hitSlop={8} style={STYLES.back}>
                    <ChevronLeft size={24} color={PaperInk.ACCENT} strokeWidth={2.4} />
                    <Text style={STYLES.backLabel}>{backLabel}</Text>
                </Pressable>
            ) : (
                <View />
            )}
            <View style={STYLES.trailing}>{trailing}</View>
        </View>
    );
}

const STYLES = StyleSheet.create({
    back: { minHeight: Metric.TOUCH, flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
    backLabel: { fontSize: 17, color: PaperInk.ACCENT },
    bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: Metric.TOUCH },
    trailing: { flexDirection: 'row', gap: 8 },
});
