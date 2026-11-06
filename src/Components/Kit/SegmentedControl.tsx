import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    options: ReadonlyArray<string>;
    selectedIndex: number;
    onChange?: (index: number) => void;
    label: string;
}

/** iOS-style segmented control on a chip-colored track. */
export function SegmentedControl({ options, selectedIndex, onChange, label }: Props): React.JSX.Element {
    return (
        <View style={STYLES.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
            {options.map((option, index) => {
                const isSelected = index === selectedIndex;

                return (
                    <Pressable
                        key={option}
                        onPress={() => onChange?.(index)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        style={[STYLES.segment, isSelected && STYLES.selected]}
                    >
                        <Text style={[STYLES.label, isSelected && STYLES.selectedLabel]} numberOfLines={1}>
                            {option}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const STYLES = StyleSheet.create({
    label: { fontSize: 14, fontWeight: '500', color: PaperInk.TEXT_MUTED },
    segment: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    selected: {
        backgroundColor: PaperInk.CARD,
        shadowColor: PaperInk.INK,
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    selectedLabel: { fontWeight: '600', color: PaperInk.TEXT },
    track: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: PaperInk.CHIP },
});
