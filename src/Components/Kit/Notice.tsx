import type { LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tone } from '@/theme/Tone';
import { ToneColor } from '@/theme/ToneColor';

interface Props {
    text: string;
    icon: LucideIcon;
    tone?: Tone;
}

/** Tinted explanatory block (warning in ochre, confirmation in accent). */
export function Notice({ text, icon: Icon, tone = Tone.Ochre }: Props): React.JSX.Element {
    const color = ToneColor.of(tone);

    return (
        <View style={[STYLES.notice, { backgroundColor: color.background }]}>
            <Icon size={18} color={color.foreground} strokeWidth={2.2} />
            <Text style={[STYLES.text, { color: color.foreground }]}>{text}</Text>
        </View>
    );
}

const STYLES = StyleSheet.create({
    notice: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18 },
    text: { flex: 1, fontSize: 14, lineHeight: 20 },
});
