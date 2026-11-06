import type { LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tone } from '@/theme/Tone';
import { ToneColor } from '@/theme/ToneColor';

interface Props {
    label: string;
    tone?: Tone;
    icon?: LucideIcon;
}

/** Small rounded label: status badge, session counter, chip. */
export function Tag({ label, tone = Tone.Neutral, icon: Icon }: Props): React.JSX.Element {
    const color = ToneColor.of(tone);

    return (
        <View style={[STYLES.tag, { backgroundColor: color.background }]}>
            {Icon ? <Icon size={12} color={color.foreground} strokeWidth={2.6} /> : null}
            <Text style={[STYLES.label, { color: color.foreground }]}>{label}</Text>
        </View>
    );
}

const STYLES = StyleSheet.create({
    label: { fontSize: 12, fontWeight: '600' },
    tag: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 10,
    },
});
