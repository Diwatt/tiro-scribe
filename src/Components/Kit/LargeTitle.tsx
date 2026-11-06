import type React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    title: string;
    overline?: string;
    subtitle?: string;
    trailing?: ReactNode;
    isCompact?: boolean;
}

/** Large title block (34 pt) with optional overline, subtitle and trailing accessory. */
export function LargeTitle({ title, overline, subtitle, trailing, isCompact = false }: Props): React.JSX.Element {
    return (
        <View style={STYLES.row}>
            <View style={STYLES.texts}>
                {overline ? <Text style={TypeScale.OVERLINE}>{overline}</Text> : null}
                <Text style={isCompact ? TypeScale.TITLE : TypeScale.LARGE_TITLE} accessibilityRole="header">
                    {title}
                </Text>
                {subtitle ? <Text style={TypeScale.SUBHEAD}>{subtitle}</Text> : null}
            </View>
            {trailing}
        </View>
    );
}

const STYLES = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4 },
    texts: { flex: 1, gap: 3 },
});
