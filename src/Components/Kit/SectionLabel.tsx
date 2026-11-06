import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    label: string;
    detail?: string;
    actionLabel?: string;
    onAction?: () => void;
}

/** Uppercase group header above a list or card, with optional detail or action on the right. */
export function SectionLabel({ label, detail, actionLabel, onAction }: Props): React.JSX.Element {
    return (
        <View style={STYLES.row}>
            <Text style={TypeScale.OVERLINE} accessibilityRole="header">
                {label}
            </Text>
            {actionLabel ? (
                <Text style={STYLES.action} onPress={onAction} accessibilityRole="button">
                    {actionLabel}
                </Text>
            ) : detail ? (
                <Text style={TypeScale.FOOTNOTE}>{detail}</Text>
            ) : null}
        </View>
    );
}

const STYLES = StyleSheet.create({
    action: { fontSize: 15, fontWeight: '500', color: PaperInk.ACCENT },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 },
});
