import { ChevronRight } from 'lucide-react-native';
import type React from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    title: string;
    detail?: string;
    value?: string;
    leading?: ReactNode;
    trailing?: ReactNode;
    onPress?: () => void;
    isTitleStrong?: boolean;
}

/** Row of a grouped list: optional leading icon, title and detail, value, then chevron when tappable. */
export function ListRow({
    title,
    detail,
    value,
    leading,
    trailing,
    onPress,
    isTitleStrong = false,
}: Props): React.JSX.Element {
    const body = (
        <View style={STYLES.row}>
            {leading}
            <View style={STYLES.texts}>
                <Text style={[STYLES.title, isTitleStrong && STYLES.strong]} numberOfLines={1}>
                    {title}
                </Text>
                {detail ? (
                    <Text style={STYLES.detail} numberOfLines={2}>
                        {detail}
                    </Text>
                ) : null}
            </View>
            {value ? <Text style={STYLES.value}>{value}</Text> : null}
            {trailing}
            {onPress && !trailing ? <ChevronRight size={16} color={PaperInk.LINE_STRONG} strokeWidth={2.6} /> : null}
        </View>
    );

    if (!onPress) {
        return body;
    }

    return (
        <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && STYLES.pressed}>
            {body}
        </Pressable>
    );
}

const STYLES = StyleSheet.create({
    detail: { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED },
    pressed: { backgroundColor: PaperInk.PAPER },
    row: {
        minHeight: Metric.ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: Metric.GUTTER,
        paddingVertical: 8,
    },
    strong: { fontWeight: '600' },
    texts: { flex: 1, gap: 2 },
    title: { fontSize: 16, color: PaperInk.TEXT },
    value: { fontSize: 15, color: PaperInk.TEXT_MUTED },
});
