import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
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

interface ChipGroupRenderProps {
    readonly value: string[];
    readonly onChange: (value: string[]) => void;
    readonly error?: string;
    readonly label?: string;
    readonly labelStyle?: StyleProp<ViewStyle>;
    readonly chipRowStyle?: StyleProp<ViewStyle>;
    readonly options: { value: string; label: string }[];
    readonly searchable: boolean;
    readonly theme: ExtendedTheme;
    readonly search: string;
    readonly onSearchChange: (search: string) => void;
}

function ChipGroupRender({
    value,
    onChange,
    error,
    label,
    labelStyle,
    chipRowStyle,
    options,
    searchable,
    theme,
    search,
    onSearchChange,
}: ChipGroupRenderProps): React.JSX.Element {
    const handleChipPress = useCallback(
        (optionValue: string): void => {
            const current = value ?? [];
            onChange(
                current.includes(optionValue) ? current.filter((x) => x !== optionValue) : [...current, optionValue],
            );
        },
        [onChange, value],
    );

    return (
        <>
            {label ? (
                <Text style={[STYLES.label, labelStyle, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
            ) : null}
            {searchable ? (
                <TextInput
                    mode="outlined"
                    placeholder="Search…"
                    value={search}
                    onChangeText={onSearchChange}
                    style={STYLES.searchInput}
                />
            ) : null}
            <View style={[STYLES.chipRow, chipRowStyle]}>
                {useMemo(
                    () =>
                        options.map((option, index) => (
                            <Chip
                                key={`${option.value}-${index}`}
                                style={STYLES.chip}
                                selected={value?.includes(option.value) ?? false}
                                onPress={() => handleChipPress(option.value)}
                            >
                                {option.label}
                            </Chip>
                        )),
                    [options, value, handleChipPress],
                )}
            </View>
            {error ? (
                <HelperText type="error" visible>
                    {error}
                </HelperText>
            ) : null}
        </>
    );
}

const STYLES = StyleSheet.create({
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

    const renderChipGroup = useCallback(
        (params: {
            field: { value: string[]; onChange: (value: string[]) => void };
            fieldState: { error?: { message?: string } };
        }) => (
            <ChipGroupRender
                value={params.field.value}
                onChange={params.field.onChange}
                error={params.fieldState.error?.message}
                label={label}
                labelStyle={labelStyle}
                chipRowStyle={chipRowStyle}
                options={filtered}
                searchable={showSearch}
                theme={theme}
                search={search}
                onSearchChange={setSearch}
            />
        ),
        [label, labelStyle, chipRowStyle, filtered, showSearch, theme, search],
    );

    return <Controller name={name} control={control} render={renderChipGroup} />;
}
