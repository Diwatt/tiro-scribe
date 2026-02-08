import type React from 'react';
import { useState } from 'react';
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

export function SelectMenu<T extends FieldValues>({ control, name, label, options, anchorStyle, anchorTextStyle }: SelectMenuProps<T>): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const [visible, setVisible] = useState(false);

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => {
                const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
                return (
                    <>
                        {label ? <Text style={{ fontSize: 14, marginBottom: 8, color: theme.colors.onSurfaceVariant }}>{label}</Text> : null}
                        <Menu
                            visible={visible}
                            onDismiss={() => setVisible(false)}
                            anchor={
                                <Pressable onPress={() => setVisible(true)}>
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
                                                borderColor: error ? theme.colors.error : theme.colors.outline,
                                            },
                                            anchorStyle,
                                        ]}
                                        pointerEvents="box-only"
                                    >
                                        <Text style={[{ fontSize: 16, color: theme.colors.onSurface }, anchorTextStyle]}>{selectedLabel}</Text>
                                        <Text style={{ color: theme.colors.onSurfaceVariant }}>▼</Text>
                                    </View>
                                </Pressable>
                            }
                        >
                            {options.map((opt) => (
                                <Menu.Item
                                    key={opt.value}
                                    onPress={() => {
                                        onChange(opt.value);
                                        setVisible(false);
                                    }}
                                    title={opt.label}
                                />
                            ))}
                        </Menu>
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
