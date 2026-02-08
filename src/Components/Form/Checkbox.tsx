import type React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { type StyleProp, StyleSheet, Text, type TextStyle, View } from 'react-native';
import { HelperText, Checkbox as PaperCheckbox, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../../theme/AppTheme';

export interface CheckboxProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    labelStyle?: StyleProp<TextStyle>;
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    label: {
        marginLeft: 8,
        fontSize: 16,
    },
});

export function Checkbox<T extends FieldValues>({ control, name, label, labelStyle }: CheckboxProps<T>): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
                <>
                    <View style={styles.row}>
                        <PaperCheckbox status={value ? 'checked' : 'unchecked'} onPress={() => onChange(!value)} />
                        <Text style={[styles.label, labelStyle, { color: theme.colors.onSurface }]}>{label}</Text>
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
