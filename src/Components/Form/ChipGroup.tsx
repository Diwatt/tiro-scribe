import type React from 'react';
import { useState } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Chip, HelperText, TextInput, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../../theme/AppTheme';

export type ChipGroupOption = string | { value: string; label: string };

function normalizeOptions(options: readonly ChipGroupOption[]): { value: string; label: string }[] {
    return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

const SEARCHABLE_THRESHOLD = 10;

export interface ChipGroupProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: string;
    options: readonly ChipGroupOption[] | ChipGroupOption[];
    labelStyle?: StyleProp<ViewStyle>;
    chipRowStyle?: StyleProp<ViewStyle>;
    /** When true or options.length > 10, show a search field to filter options. */
    searchable?: boolean;
}

const styles = StyleSheet.create({
    label: {
        fontSize: 14,
        marginBottom: 8,
    },
    searchInput: {
        marginBottom: 8,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        alignSelf: 'flex-start',
    },
});

export function ChipGroup<T extends FieldValues>({
    control,
    name,
    label,
    options,
    labelStyle,
    chipRowStyle,
    searchable,
}: ChipGroupProps<T>): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const normalized = normalizeOptions(options);
    const [search, setSearch] = useState('');
    const showSearch = searchable ?? normalized.length > SEARCHABLE_THRESHOLD;
    const filtered =
        showSearch && search.trim()
            ? normalized.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
            : normalized;

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
                <>
                    {label ? <Text style={[styles.label, labelStyle, { color: theme.colors.onSurfaceVariant }]}>{label}</Text> : null}
                    {showSearch ? (
                        <TextInput
                            mode="outlined"
                            placeholder="Search…"
                            value={search}
                            onChangeText={setSearch}
                            style={styles.searchInput}
                        />
                    ) : null}
                    <View style={[styles.chipRow, chipRowStyle]}>
                        {filtered.map((option) => (
                            <Chip
                                key={option.value}
                                style={styles.chip}
                                selected={(value as string[])?.includes(option.value) ?? false}
                                onPress={() => {
                                    const current = (value as string[]) ?? [];
                                    onChange(
                                        current.includes(option.value)
                                            ? current.filter((x) => x !== option.value)
                                            : [...current, option.value],
                                    );
                                }}
                            >
                                {option.label}
                            </Chip>
                        ))}
                    </View>
                    {error?.message ? (
                        <HelperText type="error" visible>
                            {error.message}
                        </HelperText>
                    ) : null}
                </>
            )}
        />
    );
}
