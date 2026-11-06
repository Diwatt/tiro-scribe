import type { LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    icon: LucideIcon;
    label: string;
    onPress?: () => void;
    background?: string;
    color?: string;
}

/** 44 pt round icon button used in navigation bars and sheets. */
export function RoundIconButton({
    icon: Icon,
    label,
    onPress,
    background = PaperInk.CHIP,
    color = PaperInk.INK,
}: Props): React.JSX.Element {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [STYLES.button, { backgroundColor: background, opacity: pressed ? 0.7 : 1 }]}
        >
            <Icon size={19} color={color} strokeWidth={2.4} />
        </Pressable>
    );
}

const STYLES = StyleSheet.create({
    button: {
        width: Metric.TOUCH,
        height: Metric.TOUCH,
        borderRadius: Metric.TOUCH / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
