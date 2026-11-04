import type { LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '@/theme/AppTheme';

type ThemedIconColorToken = {
    [Key in keyof ExtendedTheme['colors']]: ExtendedTheme['colors'][Key] extends string ? Key : never;
}[keyof ExtendedTheme['colors']];

/**
 * Builds lucide icon components for Paper icon slots: Paper renders a
 * ComponentType reference without passing any props, so the size and the
 * theme color token are captured at build time.
 */
export class ThemedIcon {
    public static create(config: {
        readonly icon: LucideIcon;
        readonly size: number;
        readonly colorToken: ThemedIconColorToken;
    }): () => React.JSX.Element {
        const { icon: Icon, size, colorToken } = config;
        return function ThemedIconInstance(): React.JSX.Element {
            const theme = useTheme<ExtendedTheme>();
            return <Icon size={size} color={theme.colors[colorToken]} />;
        };
    }
}
