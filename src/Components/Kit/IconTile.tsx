import type { LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tone } from '@/theme/Tone';
import { ToneColor } from '@/theme/ToneColor';

interface Props {
    icon: LucideIcon;
    tone?: Tone;
    size?: number;
    isRound?: boolean;
}

/** Leading icon on a tinted square (settings rows, checks, cards). */
export function IconTile({ icon: Icon, tone = Tone.Neutral, size = 32, isRound = false }: Props): React.JSX.Element {
    const color = ToneColor.of(tone);

    return (
        <View
            style={[
                STYLES.tile,
                { width: size, height: size, borderRadius: isRound ? size / 2 : size * 0.3, backgroundColor: color.background },
            ]}
        >
            <Icon size={size * 0.55} color={color.foreground} strokeWidth={2.2} />
        </View>
    );
}

const STYLES = StyleSheet.create({
    tile: { alignItems: 'center', justifyContent: 'center' },
});
