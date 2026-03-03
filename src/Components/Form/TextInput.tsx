import type React from 'react';
import { useCallback, useState } from 'react';
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
    const [currentFieldOnChange, setCurrentFieldOnChange] = useState<((text: string) => void) | null>(null);

    const handleChange = useCallback(
        (text: string) => {
            if (currentFieldOnChange) {
                if (numericOnly) {
                    const filtered = text.replaceAll(/\D/g, '');
                    currentFieldOnChange(filtered);
                } else {
                    currentFieldOnChange(text);
                }
            }
        },
        [currentFieldOnChange, numericOnly],
    );

    const renderTextInput = useCallback(
        (params: {
            field: { onChange: (text: string) => void; onBlur: () => void; value: string };
            fieldState: { error?: { message?: string } };
        }) => {
            setCurrentFieldOnChange(() => params.field.onChange);

            return (
                <>
                    <PaperTextInput
                        label={label}
                        value={params.field.value}
                        onChangeText={handleChange}
                        onBlur={params.field.onBlur}
                        secureTextEntry={secureTextEntry}
                        keyboardType={keyboardType}
                        autoCapitalize={autoCapitalize}
                        mode="outlined"
                        error={!!params.fieldState.error}
                        style={style}
                        showSoftInputOnFocus
                        activeOutlineColor={theme.colors.tertiary}
                    />
                    {params.fieldState.error?.message ? (
                        <HelperText type="error" visible>
                            {params.fieldState.error.message}
                        </HelperText>
                    ) : null}
                </>
            );
        },
        [theme, label, secureTextEntry, keyboardType, autoCapitalize, style, handleChange],
    );

    return <Controller name={name} control={control} render={renderTextInput} />;
}
