import { Search } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    placeholder: string;
    value?: string;
    onChangeText?: (text: string) => void;
}

/** Rounded search field on a chip-colored ground. */
export function SearchField({ placeholder, value, onChangeText }: Props): React.JSX.Element {
    return (
        <View style={STYLES.field}>
            <Search size={17} color={PaperInk.TEXT_MUTED} strokeWidth={2.4} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={PaperInk.TEXT_MUTED}
                accessibilityLabel={placeholder}
                style={STYLES.input}
                returnKeyType="search"
            />
        </View>
    );
}

const STYLES = StyleSheet.create({
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 42,
        paddingHorizontal: 12,
        borderRadius: Metric.RADIUS_SMALL,
        backgroundColor: PaperInk.CHIP,
    },
    input: { flex: 1, fontSize: 16, color: PaperInk.TEXT, paddingVertical: 8 },
});
