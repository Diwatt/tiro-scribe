import type React from 'react';
import { useCallback } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { type StyleProp, StyleSheet, Text, type TextStyle, View } from 'react-native';
import { HelperText, Checkbox as PaperCheckbox, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../../theme/AppTheme';

export interface CheckboxProps<T extends FieldValues> {
    readonly control: Control<T>;
    readonly name: FieldPath<T>;
    readonly label: string;
    readonly labelStyle?: StyleProp<TextStyle>;
}

const STYLES = StyleSheet.create({
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

interface CheckboxRenderProps {
    readonly value: boolean;
    readonly onChange: (value: boolean) => void;
    readonly error?: string;
    readonly label: string;
    readonly labelStyle?: StyleProp<TextStyle>;
    readonly theme: ExtendedTheme;
}

function CheckboxRender({ value, onChange, error, label, labelStyle, theme }: CheckboxRenderProps): React.JSX.Element {
    const handlePress = useCallback((): void => onChange(!value), [onChange, value]);

    return (
        <>
            <View style={STYLES.row}>
                <PaperCheckbox status={value ? 'checked' : 'unchecked'} onPress={handlePress} />
                <Text style={[STYLES.label, labelStyle, { color: theme.colors.onSurface }]}>{label}</Text>
            </View>
            {error ? (
                <HelperText type="error" visible>
                    {error}
                </HelperText>
            ) : null}
        </>
    );
}

export function Checkbox<T extends FieldValues>({
    control,
    name,
    label,
    labelStyle,
}: CheckboxProps<T>): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();

    const renderCheckbox = useCallback(
        (params: {
            field: { value: boolean; onChange: (value: boolean) => void };
            fieldState: { error?: { message?: string } };
        }) => (
            <CheckboxRender
                value={params.field.value}
                onChange={params.field.onChange}
                error={params.fieldState.error?.message}
                label={label}
                labelStyle={labelStyle}
                theme={theme}
            />
        ),
        [label, labelStyle, theme],
    );

    return <Controller name={name} control={control} render={renderCheckbox} />;
}
