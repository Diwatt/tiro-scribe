import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import {
    type StyleProp,
    Dimensions,
    Keyboard,
    type KeyboardEvent,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput as RNTextInput,
    View,
    type ViewStyle,
} from 'react-native';
import { Button, HelperText, List, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../../theme/AppTheme';

export type MultiSelectOption = string | { value: string; label: string };

function normalizeOptions(options: readonly MultiSelectOption[]): { value: string; label: string }[] {
    return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

export interface MultiSelectModalProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    options: readonly MultiSelectOption[] | MultiSelectOption[];
    placeholder?: string;
    labelStyle?: StyleProp<ViewStyle>;
    triggerStyle?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
    label: { fontSize: 14, marginBottom: 8 },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 56,
        marginBottom: 12,
    },
    triggerText: { fontSize: 16, flex: 1, marginRight: 8 },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '80%',
        paddingBottom: 24,
        flexGrow: 0,
    },
    listWrap: { flex: 1, minHeight: 0 },
    searchInput: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
    },
    list: { paddingBottom: 8 },
    doneButton: { marginHorizontal: 16, marginTop: 16 },
});

export function MultiSelectModal<T extends FieldValues>({
    control,
    name,
    label,
    options,
    placeholder = 'Search…',
    labelStyle,
    triggerStyle,
}: MultiSelectModalProps<T>): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const normalized = useMemo(() => normalizeOptions(options), [options]);
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? normalized.filter((o) => o.label.toLowerCase().includes(q)) : normalized;
    }, [normalized, search]);

    const open = useCallback(() => {
        Keyboard.dismiss();
        setSearch('');
        setVisible(true);
    }, []);
    const close = useCallback(() => setVisible(false), []);

    const buildTriggerLabel = useCallback(
        (selected: string[]): string => {
            const count = selected.length;
            if (count === 0) {
                return 'Select…';
            }
            const selectedLabels = selected.map((v) => normalized.find((o) => o.value === v)?.label ?? v).filter(Boolean);
            if (count <= 3) {
                return selectedLabels.join(', ');
            }
            return `${selectedLabels.slice(0, 2).join(', ')} +${count - 2} more`;
        },
        [normalized],
    );

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => {
                const selected = (value as string[]) ?? [];
                const count = selected.length;
                const triggerLabel = buildTriggerLabel(selected);

                return (
                    <>
                        {label ? <Text style={[styles.label, labelStyle, { color: theme.colors.onSurfaceVariant }]}>{label}</Text> : null}
                        <Pressable
                            onPress={open}
                            style={[
                                styles.trigger,
                                triggerStyle,
                                {
                                    backgroundColor: theme.colors.surface,
                                    borderColor: error ? theme.colors.error : theme.colors.outline,
                                },
                            ]}
                        >
                            <Text style={[styles.triggerText, { color: count === 0 ? theme.colors.onSurfaceVariant : theme.colors.primary }]} numberOfLines={2}>
                                {triggerLabel}
                            </Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>▼</Text>
                        </Pressable>
                        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
                            <Pressable style={styles.modalBackdrop} onPress={close}>
                                <Pressable
                                    style={[
                                        styles.modalContent,
                                        {
                                            backgroundColor: theme.colors.surface,
                                            marginBottom: keyboardHeight,
                                            ...(keyboardHeight > 0
                                                ? {
                                                      height: Dimensions.get('window').height - keyboardHeight - 56,
                                                  }
                                                : { maxHeight: '80%' }),
                                        },
                                    ]}
                                    onPress={() => undefined}
                                >
                                    <RNTextInput
                                        placeholder={placeholder}
                                        placeholderTextColor={theme.colors.onSurfaceVariant}
                                        value={search}
                                        onChangeText={setSearch}
                                        showSoftInputOnFocus
                                        style={[
                                            styles.searchInput,
                                            {
                                                backgroundColor: theme.colors.surface,
                                                borderColor: theme.colors.outline,
                                                color: theme.colors.onSurface,
                                            },
                                        ]}
                                    />
                                    <View style={styles.listWrap}>
                                        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                                            {filtered.map((option) => {
                                                const isSelected = selected.includes(option.value);
                                                return (
                                                    <List.Item
                                                        key={option.value}
                                                        title={option.label}
                                                        onPress={() => {
                                                            onChange(isSelected ? selected.filter((v) => v !== option.value) : [...selected, option.value]);
                                                        }}
                                                        right={(props) => (
                                                            <List.Icon
                                                                {...props}
                                                                icon={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                                                color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                                            />
                                                        )}
                                                    />
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                    <Button mode="contained" onPress={close} style={styles.doneButton}>
                                        Done
                                    </Button>
                                </Pressable>
                            </Pressable>
                        </Modal>
                        {error?.message ? (
                            <HelperText type="error" visible>
                                {error.message}
                            </HelperText>
                        ) : null}
                    </>
                );
            }}
        />
    );
}
