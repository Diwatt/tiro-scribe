import type { LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ButtonKind } from './ButtonKind';
import { ButtonPalette } from './ButtonPalette';

interface Props {
    label: string;
    onPress?: () => void;
    kind?: ButtonKind;
    icon?: LucideIcon;
    isDisabled?: boolean;
    height?: number;
}

/** Full-width pill button: ink (primary), light (on dark grounds) or outline. */
export function PillButton({
    label,
    onPress,
    kind = ButtonKind.Primary,
    icon: Icon,
    isDisabled = false,
    height = 56,
}: Props): React.JSX.Element {
    const palette = ButtonPalette.of(kind);

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled }}
            style={({ pressed }) => [
                STYLES.button,
                {
                    minHeight: height,
                    borderRadius: height / 2,
                    backgroundColor: palette.background,
                    borderColor: palette.border,
                    opacity: isDisabled ? 0.4 : pressed ? 0.8 : 1,
                },
            ]}
        >
            {Icon ? <Icon size={18} color={palette.text} strokeWidth={2.4} /> : null}
            <Text style={[STYLES.label, { color: palette.text }]}>{label}</Text>
        </Pressable>
    );
}

const STYLES = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 20,
        borderWidth: 1,
    },
    label: { fontSize: 17, fontWeight: '600' },
});
