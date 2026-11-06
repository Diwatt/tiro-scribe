import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '@/theme/FontFamily';
import { PaperInk } from '@/theme/PaperInk';
import { TiroMark } from './TiroMark';

interface Props {
    size: number;
    ink?: string;
    ground?: string;
    fill?: string;
}

/**
 * Mark + "Tiro" in a handwritten script. The chosen face is Parisienne; until its font file
 * is bundled, the platform script face stands in.
 */
export function Wordmark({
    size,
    ink = PaperInk.BRAND_INK,
    ground = PaperInk.PAPER,
    fill = PaperInk.BRAND_WATER,
}: Props): React.JSX.Element {
    return (
        <View style={STYLES.row} accessibilityRole="header" accessibilityLabel="Tiro">
            <TiroMark size={size} ink={ink} ground={ground} fill={fill} />
            <Text style={[STYLES.word, { color: ink, fontSize: size * 0.82 }]}>Tiro</Text>
        </View>
    );
}

const STYLES = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    word: {
        fontFamily: FontFamily.SCRIPT,
        includeFontPadding: false,
    },
});
