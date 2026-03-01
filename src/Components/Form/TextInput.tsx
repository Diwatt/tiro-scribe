import type React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { TextInputProps as PaperTextInputProps } from 'react-native-paper';
import { HelperText, TextInput as PaperTextInput, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../../theme/AppTheme';

export interface TextInputProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    secureTextEntry?: boolean;
    keyboardType?: PaperTextInputProps['keyboardType'];
    autoCapitalize?: PaperTextInputProps['autoCapitalize'];
    style?: PaperTextInputProps['style'];
    /** When true, only allow digits (0-9). */
    numericOnly?: boolean;
}

export function TextInput<T extends FieldValues>({
    control,
    name,
    label,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    style,
    numericOnly,
}: TextInputProps<T>): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
                const handleChange = (text: string) => {
                    if (numericOnly) {
                        const filtered = text.replace(/[^0-9]/g, '');
                        onChange(filtered);
                    } else {
                        onChange(text);
                    }
                };

                return (
                    <>
                        <PaperTextInput
                            label={label}
                            value={value as string}
                            onChangeText={handleChange}
                            onBlur={onBlur}
                            secureTextEntry={secureTextEntry}
                            keyboardType={keyboardType}
                            autoCapitalize={autoCapitalize}
                            mode="outlined"
                            error={!!error}
                            style={style}
                            showSoftInputOnFocus
                            activeOutlineColor={theme.colors.tertiary}
                        />
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
