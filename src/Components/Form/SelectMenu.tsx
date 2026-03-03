import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Pressable, type StyleProp, Text, View, type ViewStyle } from 'react-native';
import { HelperText, Menu, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../../theme/AppTheme';

export interface SelectMenuOption {
    value: string;
    label: string;
}

export interface SelectMenuProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    options: SelectMenuOption[];
    anchorStyle?: StyleProp<ViewStyle>;
    anchorTextStyle?: StyleProp<ViewStyle>;
}

export function SelectMenu<T extends FieldValues>({
    control,
    name,
    label,
    options,
    anchorStyle,
    anchorTextStyle,
}: SelectMenuProps<T>): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const [visible, setVisible] = useState(false);
    const [currentFieldOnChange, setCurrentFieldOnChange] = useState<((value: string) => void) | null>(null);

    const handleDismiss = useCallback(() => setVisible(false), []);
    const handlePress = useCallback(() => setVisible(true), []);
    const handleOptionPress = useCallback(
        (optValue: string) => {
            if (currentFieldOnChange) {
                currentFieldOnChange(optValue);
                setVisible(false);
            }
        },
        [currentFieldOnChange],
    );

    const optionPressHandlers = useMemo(() => {
        return Object.fromEntries(options.map((opt) => [opt.value, () => handleOptionPress(opt.value)])) as Record<
            string,
            () => void
        >;
    }, [handleOptionPress, options]);

    const renderSelectMenu = useCallback(
        (params: {
            field: { value: string; onChange: (value: string) => void };
            fieldState: { error?: { message?: string } };
        }) => {
            const selectedLabel = options.find((o) => o.value === params.field.value)?.label ?? params.field.value;
            setCurrentFieldOnChange(() => params.field.onChange);

            return (
                <>
                    {label ? (
                        <Text style={{ fontSize: 14, marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                            {label}
                        </Text>
                    ) : null}
                    <Menu
                        visible={visible}
                        onDismiss={handleDismiss}
                        anchor={
                            <Pressable onPress={handlePress}>
                                <View
                                    style={[
                                        {
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            borderWidth: 1,
                                            borderRadius: 4,
                                            paddingHorizontal: 12,
                                            paddingVertical: 16,
                                            minHeight: 56,
                                            marginBottom: 12,
                                            backgroundColor: theme.colors.surface,
                                            borderColor: params.fieldState.error
                                                ? theme.colors.error
                                                : theme.colors.outline,
                                        },
                                        anchorStyle,
                                    ]}
                                    pointerEvents="box-only"
                                >
                                    <Text style={[{ fontSize: 16, color: theme.colors.onSurface }, anchorTextStyle]}>
                                        {selectedLabel}
                                    </Text>
                                    <Text style={{ color: theme.colors.onSurfaceVariant }}>▼</Text>
                                </View>
                            </Pressable>
                        }
                    >
                        {options.map((opt) => (
                            <Menu.Item key={opt.value} onPress={optionPressHandlers[opt.value]} title={opt.label} />
                        ))}
                    </Menu>
                    {params.fieldState.error?.message ? (
                        <HelperText type="error" visible>
                            {params.fieldState.error.message}
                        </HelperText>
                    ) : null}
                </>
            );
        },
        [options, theme, anchorStyle, anchorTextStyle, label, visible, handleDismiss, handlePress, optionPressHandlers],
    );

    return <Controller name={name} control={control} render={renderSelectMenu} />;
}
