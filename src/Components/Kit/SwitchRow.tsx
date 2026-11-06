import type React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    title: string;
    detail?: string;
    isOn: boolean;
    onChange?: (isOn: boolean) => void;
}

/** Grouped-list row ending with a native switch tinted with the accent. */
export function SwitchRow({ title, detail, isOn, onChange }: Props): React.JSX.Element {
    return (
        <View style={STYLES.row}>
            <View style={STYLES.texts}>
                <Text style={STYLES.title}>{title}</Text>
                {detail ? <Text style={STYLES.detail}>{detail}</Text> : null}
            </View>
            <Switch
                value={isOn}
                onValueChange={onChange}
                accessibilityLabel={title}
                trackColor={{ false: PaperInk.TRACK, true: PaperInk.ACCENT }}
                thumbColor={PaperInk.WHITE}
                ios_backgroundColor={PaperInk.TRACK}
            />
        </View>
    );
}

const STYLES = StyleSheet.create({
    detail: { fontSize: 13, color: PaperInk.TEXT_MUTED },
    row: {
        minHeight: Metric.ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: Metric.GUTTER,
        paddingVertical: 8,
    },
    texts: { flex: 1, gap: 2 },
    title: { fontSize: 16, color: PaperInk.TEXT },
});
