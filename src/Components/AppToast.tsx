import type React from 'react';
import { useTheme } from 'react-native-paper';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import type { ExtendedTheme } from '../theme/AppTheme';

const TOAST_BORDER_LEFT_WIDTH = 5;
const TOAST_CONTENT_PADDING_HORIZONTAL = 15;
const TOAST_TEXT1_FONT_SIZE = 15;
const TOAST_TEXT2_FONT_SIZE = 13;

export function AppToast(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { colors } = theme;
    const successBg = colors.actions.success.background;
    const errorBg = colors.error;
    const surface = colors.surface;
    const onSurface = colors.onSurface;
    const roundness = theme.roundness ?? 8;

    const toastConfig = {
        success: (props: Parameters<typeof BaseToast>[0]) => (
            <BaseToast
                {...props}
                style={{
                    borderLeftColor: successBg,
                    borderLeftWidth: TOAST_BORDER_LEFT_WIDTH,
                    backgroundColor: surface,
                    borderRadius: roundness,
                }}
                contentContainerStyle={{ paddingHorizontal: TOAST_CONTENT_PADDING_HORIZONTAL }}
                text1Style={{
                    fontSize: TOAST_TEXT1_FONT_SIZE,
                    fontWeight: '600',
                    color: onSurface,
                }}
                text2Style={{
                    fontSize: TOAST_TEXT2_FONT_SIZE,
                    color: onSurface,
                }}
            />
        ),
        error: (props: Parameters<typeof ErrorToast>[0]) => (
            <ErrorToast
                {...props}
                style={{
                    borderLeftColor: errorBg,
                    borderLeftWidth: TOAST_BORDER_LEFT_WIDTH,
                    backgroundColor: surface,
                    borderRadius: roundness,
                }}
                contentContainerStyle={{ paddingHorizontal: TOAST_CONTENT_PADDING_HORIZONTAL }}
                text1Style={{
                    fontSize: TOAST_TEXT1_FONT_SIZE,
                    fontWeight: '600',
                    color: onSurface,
                }}
                text2Style={{
                    fontSize: TOAST_TEXT2_FONT_SIZE,
                    color: onSurface,
                }}
            />
        ),
    };

    return <Toast config={toastConfig} />;
}
