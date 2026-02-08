/**
 * Application theme configuration
 * Extends Material Design 3 (MD3) theme with pastel rainbow color palette
 */

import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';
import type { MD3Theme } from 'react-native-paper';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// Extend colord with the mix plugin
extend([mixPlugin]);

interface StatusColors {
    background: string;
    text: string;
    accent: string;
    iconBackground: string;
    shadowColor: string;
}

export interface SecureSessionButtonColors {
    idleBackground: string;
    activeBackground: string;
    waveformColor: string;
    textColor: string;
    iconColor: string;
    // Pre-calculated colors for text and icons
    idleTextIconColor: string; // idleBackground darkened by 65%
    recordingIconColorDark: string; // activeBackground darkened by 65%
    recordingIconColorLight: string; // activeBackground darkened by 15%
}

/**
 * Action button colors interface
 */
export interface ActionButtonColors {
    background: string;
    text: string;
    pressed: string;
    shadow: string;
}

/**
 * Action group colors - semantic categories for different button types
 */
export interface ActionGroupColors {
    critical: ActionButtonColors; // Record, Delete (Amethyst)
    primary: ActionButtonColors; // Save, Login, Next (Ocean Blue)
    success: ActionButtonColors; // Confirm, Done (Teal)
}

type ExtendedColors = typeof MD3LightTheme.colors & {
    statusIdle: StatusColors;
    statusProcessing: StatusColors;
    statusBatchWaiting: StatusColors;
    statusSetup: StatusColors;
    statusError: StatusColors;
    statusWarning: StatusColors;
    secureSessionButton: SecureSessionButtonColors;
    actions: ActionGroupColors;
};

/**
 * Pastel Rainbow Base Colors
 * Only 9 base colors - all other colors are derived from these
 */
const BASE_COLORS = {
    yellow: '#FAEDCB',
    mint: '#C9E4DE',
    blue: '#C6DEF1',
    lavender: '#DBCDF0',
    pink: '#F2C6DE',
    peach: '#F7D9C4',
    // Action colors (saturated for contrast)
    amethyst: '#8E7CC3', // Critical actions (Record, Delete)
    ocean: '#5B84B1', // Primary actions (Save, Submit, Next)
    teal: '#45B7A0', // Success actions (Confirm, Done)
} as const;

/**
 * Text color - dark neutral
 */
const TEXT_COLOR = '#2C2C2C';
const TEXT_COLOR_LIGHT = '#FFFFFF';

/**
 * Derived colors using darken/lighten functions
 */
const pastelColors = {
    // Base colors (exported for reference)
    ...BASE_COLORS,

    // Primary colors (derived from mint)
    primary: colord(BASE_COLORS.mint).darken(0.5).toHex(),
    onPrimary: TEXT_COLOR_LIGHT,
    primaryContainer: BASE_COLORS.mint,
    onPrimaryContainer: colord(BASE_COLORS.mint).darken(0.5).toHex(),

    // Secondary colors (derived from blue)
    secondary: colord(BASE_COLORS.blue).darken(0.5).toHex(),
    onSecondary: TEXT_COLOR_LIGHT,
    secondaryContainer: BASE_COLORS.blue,
    onSecondaryContainer: colord(BASE_COLORS.blue).darken(0.5).toHex(),

    // Tertiary colors (derived from lavender)
    tertiary: colord(BASE_COLORS.lavender).darken(0.5).toHex(),
    onTertiary: TEXT_COLOR_LIGHT,
    tertiaryContainer: BASE_COLORS.lavender,
    onTertiaryContainer: colord(BASE_COLORS.lavender).darken(0.5).toHex(),

    // Error colors (derived from pink)
    error: colord(BASE_COLORS.pink).darken(0.6).toHex(),
    onError: TEXT_COLOR_LIGHT,
    errorContainer: colord(BASE_COLORS.pink).lighten(0.3).toHex(),
    onErrorContainer: colord(BASE_COLORS.pink).darken(0.7).toHex(),

    // Background and surface
    background: '#FAFAFA',
    onBackground: TEXT_COLOR,
    surface: '#FFFFFF',
    onSurface: TEXT_COLOR,
    surfaceVariant: colord(BASE_COLORS.peach).lighten(0.4).toHex(),
    onSurfaceVariant: colord(TEXT_COLOR).mix('#FFFFFF', 0.48).toHex(), // Neutral gray for labels/body; avoid peach (reads as error)
    outline: colord(BASE_COLORS.mint).darken(0.3).toHex(),
    outlineVariant: colord(BASE_COLORS.mint).lighten(0.2).toHex(),
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: colord(BASE_COLORS.mint).darken(0.7).toHex(),
    inverseOnSurface: colord(BASE_COLORS.mint).lighten(0.9).toHex(),
    inversePrimary: BASE_COLORS.mint,
    elevation: {
        level0: 'transparent',
        level1: colord(BASE_COLORS.peach).lighten(0.5).toHex(),
        level2: colord(BASE_COLORS.peach).lighten(0.45).toHex(),
        level3: colord(BASE_COLORS.peach).lighten(0.4).toHex(),
        level4: colord(BASE_COLORS.peach).lighten(0.35).toHex(),
        level5: colord(BASE_COLORS.peach).lighten(0.3).toHex(),
    },
    surfaceDisabled: colord(TEXT_COLOR).mix('#FFFFFF', 0.12).toHex(),
    onSurfaceDisabled: colord(TEXT_COLOR).mix('#FFFFFF', 0.38).toHex(),
    backdrop: 'rgba(0, 0, 0, 0.5)',

    // Status colors - all derived from base pastel colors
    statusIdle: {
        background: BASE_COLORS.mint,
        text: colord(BASE_COLORS.mint).darken(0.65).toHex(),
        accent: colord(BASE_COLORS.mint).darken(0.65).toHex(),
        iconBackground: colord(BASE_COLORS.mint).mix(TEXT_COLOR, 0.1).toHex(),
        shadowColor: colord(BASE_COLORS.mint).darken(0.65).toHex(),
    },
    statusProcessing: {
        background: BASE_COLORS.blue,
        text: colord(BASE_COLORS.blue).darken(0.65).toHex(),
        accent: colord(BASE_COLORS.blue).darken(0.65).toHex(),
        iconBackground: colord(BASE_COLORS.blue).mix(TEXT_COLOR, 0.1).toHex(),
        shadowColor: colord(BASE_COLORS.blue).darken(0.65).toHex(),
    },
    statusBatchWaiting: {
        background: BASE_COLORS.peach,
        text: colord(BASE_COLORS.peach).darken(0.65).toHex(),
        accent: colord(BASE_COLORS.peach).darken(0.65).toHex(),
        iconBackground: colord(BASE_COLORS.peach).mix(TEXT_COLOR, 0.1).toHex(),
        shadowColor: colord(BASE_COLORS.peach).darken(0.65).toHex(),
    },
    statusSetup: {
        background: BASE_COLORS.lavender,
        text: colord(BASE_COLORS.lavender).darken(0.65).toHex(),
        accent: colord(BASE_COLORS.lavender).darken(0.65).toHex(),
        iconBackground: colord(BASE_COLORS.lavender).mix(TEXT_COLOR, 0.1).toHex(),
        shadowColor: colord(BASE_COLORS.lavender).darken(0.65).toHex(),
    },
    statusError: {
        background: BASE_COLORS.pink,
        text: colord(BASE_COLORS.pink).darken(0.65).toHex(),
        accent: colord(BASE_COLORS.pink).darken(0.65).toHex(),
        iconBackground: colord(BASE_COLORS.pink).mix(TEXT_COLOR, 0.1).toHex(),
        shadowColor: colord(BASE_COLORS.pink).darken(0.65).toHex(),
    },
    statusWarning: {
        background: BASE_COLORS.yellow,
        text: colord(BASE_COLORS.yellow).darken(0.65).toHex(),
        accent: colord(BASE_COLORS.yellow).darken(0.65).toHex(),
        iconBackground: colord(BASE_COLORS.yellow).mix(TEXT_COLOR, 0.1).toHex(),
        shadowColor: colord(BASE_COLORS.yellow).darken(0.65).toHex(),
    },
    secureSessionButton: {
        idleBackground: BASE_COLORS.peach,
        activeBackground: BASE_COLORS.pink,
        waveformColor: BASE_COLORS.lavender,
        textColor: TEXT_COLOR,
        iconColor: TEXT_COLOR_LIGHT,
        idleTextIconColor: colord(BASE_COLORS.peach).darken(0.65).toHex(),
        recordingIconColorDark: colord(BASE_COLORS.pink).darken(0.65).toHex(),
        recordingIconColorLight: colord(BASE_COLORS.pink).darken(0.15).toHex(),
    },
    // Action group colors for CTA buttons
    actions: {
        // Critical: Record, Delete (Amethyst)
        critical: {
            background: BASE_COLORS.amethyst,
            text: TEXT_COLOR_LIGHT,
            pressed: colord(BASE_COLORS.amethyst).darken(0.15).toHex(),
            shadow: colord(BASE_COLORS.amethyst).lighten(0.2).alpha(0.5).toHex(),
        },
        // Primary: Save, Submit, Next (Ocean Blue)
        primary: {
            background: BASE_COLORS.ocean,
            text: TEXT_COLOR_LIGHT,
            pressed: colord(BASE_COLORS.ocean).darken(0.15).toHex(),
            shadow: colord(BASE_COLORS.ocean).lighten(0.2).alpha(0.5).toHex(),
        },
        // Success: Confirm, Done (Teal)
        success: {
            background: BASE_COLORS.teal,
            text: TEXT_COLOR_LIGHT,
            pressed: colord(BASE_COLORS.teal).darken(0.15).toHex(),
            shadow: colord(BASE_COLORS.teal).lighten(0.2).alpha(0.5).toHex(),
        },
    },
};

/**
 * Light theme with medical color palette
 */
export const AppLightTheme: MD3Theme & { colors: ExtendedColors } = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        ...pastelColors,
    },
    roundness: 8,
};

/**
 * Dark theme with medical color palette (adjusted for dark mode)
 */
export const AppDarkTheme: MD3Theme & { colors: ExtendedColors } = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        // Primary colors (derived from mint - lighter for dark mode)
        primary: colord(BASE_COLORS.mint).lighten(0.2).toHex(),
        onPrimary: colord(BASE_COLORS.mint).darken(0.7).toHex(),
        primaryContainer: colord(BASE_COLORS.mint).darken(0.6).toHex(),
        onPrimaryContainer: colord(BASE_COLORS.mint).lighten(0.3).toHex(),

        // Secondary colors (derived from blue - lighter for dark mode)
        secondary: colord(BASE_COLORS.blue).lighten(0.2).toHex(),
        onSecondary: colord(BASE_COLORS.blue).darken(0.7).toHex(),
        secondaryContainer: colord(BASE_COLORS.blue).darken(0.6).toHex(),
        onSecondaryContainer: colord(BASE_COLORS.blue).lighten(0.3).toHex(),

        // Tertiary colors (derived from lavender - lighter for dark mode)
        tertiary: colord(BASE_COLORS.lavender).lighten(0.2).toHex(),
        onTertiary: colord(BASE_COLORS.lavender).darken(0.7).toHex(),
        tertiaryContainer: colord(BASE_COLORS.lavender).darken(0.6).toHex(),
        onTertiaryContainer: colord(BASE_COLORS.lavender).lighten(0.3).toHex(),

        // Error colors (derived from pink)
        error: colord(BASE_COLORS.pink).lighten(0.3).toHex(),
        onError: colord(BASE_COLORS.pink).darken(0.8).toHex(),
        errorContainer: colord(BASE_COLORS.pink).darken(0.7).toHex(),
        onErrorContainer: colord(BASE_COLORS.pink).lighten(0.4).toHex(),

        // Background and surface (dark)
        background: colord(BASE_COLORS.mint).darken(0.85).toHex(),
        onBackground: colord(BASE_COLORS.mint).lighten(0.8).toHex(),
        surface: colord(BASE_COLORS.mint).darken(0.83).toHex(),
        onSurface: colord(BASE_COLORS.mint).lighten(0.8).toHex(),
        surfaceVariant: colord(BASE_COLORS.peach).darken(0.7).toHex(),
        onSurfaceVariant: colord(TEXT_COLOR_LIGHT).mix(colord(BASE_COLORS.mint).darken(0.83).toHex(), 0.35).toHex(), // Neutral muted light for labels/body
        outline: colord(BASE_COLORS.mint).lighten(0.4).toHex(),
        outlineVariant: colord(BASE_COLORS.mint).darken(0.7).toHex(),
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: colord(BASE_COLORS.mint).lighten(0.8).toHex(),
        inverseOnSurface: colord(BASE_COLORS.mint).darken(0.7).toHex(),
        inversePrimary: BASE_COLORS.mint,
        elevation: {
            level0: 'transparent',
            level1: colord(BASE_COLORS.mint).darken(0.8).toHex(),
            level2: colord(BASE_COLORS.mint).darken(0.78).toHex(),
            level3: colord(BASE_COLORS.mint).darken(0.76).toHex(),
            level4: colord(BASE_COLORS.mint).darken(0.74).toHex(),
            level5: colord(BASE_COLORS.mint).darken(0.72).toHex(),
        },
        surfaceDisabled: colord(colord(BASE_COLORS.mint).lighten(0.8).toHex()).mix(colord(BASE_COLORS.mint).darken(0.83).toHex(), 0.12).toHex(),
        onSurfaceDisabled: colord(colord(BASE_COLORS.mint).lighten(0.8).toHex()).mix(colord(BASE_COLORS.mint).darken(0.83).toHex(), 0.38).toHex(),
        backdrop: 'rgba(0, 0, 0, 0.5)',

        // Status colors - all derived from base pastel colors (darker backgrounds for dark mode)
        statusIdle: {
            background: colord(BASE_COLORS.mint).darken(0.7).toHex(),
            text: colord(BASE_COLORS.mint).lighten(0.5).toHex(),
            accent: colord(BASE_COLORS.mint).lighten(0.3).toHex(),
            iconBackground: colord(BASE_COLORS.mint).mix(TEXT_COLOR_LIGHT, 0.2).toHex(),
            shadowColor: colord(BASE_COLORS.mint).lighten(0.3).toHex(),
        },
        statusProcessing: {
            background: colord(BASE_COLORS.blue).darken(0.7).toHex(),
            text: colord(BASE_COLORS.blue).lighten(0.5).toHex(),
            accent: colord(BASE_COLORS.blue).lighten(0.3).toHex(),
            iconBackground: colord(BASE_COLORS.blue).mix(TEXT_COLOR_LIGHT, 0.2).toHex(),
            shadowColor: colord(BASE_COLORS.blue).lighten(0.3).toHex(),
        },
        statusBatchWaiting: {
            background: colord(BASE_COLORS.peach).darken(0.7).toHex(),
            text: colord(BASE_COLORS.peach).lighten(0.5).toHex(),
            accent: colord(BASE_COLORS.peach).lighten(0.3).toHex(),
            iconBackground: colord(BASE_COLORS.peach).mix(TEXT_COLOR_LIGHT, 0.2).toHex(),
            shadowColor: colord(BASE_COLORS.peach).lighten(0.3).toHex(),
        },
        statusSetup: {
            background: colord(BASE_COLORS.lavender).darken(0.7).toHex(),
            text: colord(BASE_COLORS.lavender).lighten(0.5).toHex(),
            accent: colord(BASE_COLORS.lavender).lighten(0.3).toHex(),
            iconBackground: colord(BASE_COLORS.lavender).mix(TEXT_COLOR_LIGHT, 0.2).toHex(),
            shadowColor: colord(BASE_COLORS.lavender).lighten(0.3).toHex(),
        },
        statusError: {
            background: colord(BASE_COLORS.pink).darken(0.7).toHex(),
            text: colord(BASE_COLORS.pink).lighten(0.5).toHex(),
            accent: colord(BASE_COLORS.pink).lighten(0.3).toHex(),
            iconBackground: colord(BASE_COLORS.pink).mix(TEXT_COLOR_LIGHT, 0.2).toHex(),
            shadowColor: colord(BASE_COLORS.pink).lighten(0.3).toHex(),
        },
        statusWarning: {
            background: colord(BASE_COLORS.yellow).darken(0.7).toHex(),
            text: colord(BASE_COLORS.yellow).lighten(0.5).toHex(),
            accent: colord(BASE_COLORS.yellow).lighten(0.3).toHex(),
            iconBackground: colord(BASE_COLORS.yellow).mix(TEXT_COLOR_LIGHT, 0.2).toHex(),
            shadowColor: colord(BASE_COLORS.yellow).lighten(0.3).toHex(),
        },
        secureSessionButton: {
            idleBackground: colord(BASE_COLORS.peach).darken(0.7).toHex(),
            activeBackground: BASE_COLORS.pink,
            waveformColor: colord(BASE_COLORS.lavender).darken(0.5).toHex(),
            textColor: colord(BASE_COLORS.peach).lighten(0.8).toHex(),
            iconColor: TEXT_COLOR_LIGHT,
            idleTextIconColor: colord(colord(BASE_COLORS.peach).darken(0.7).toHex()).darken(0.65).toHex(),
            recordingIconColorDark: colord(BASE_COLORS.pink).darken(0.65).toHex(),
            recordingIconColorLight: colord(BASE_COLORS.pink).darken(0.15).toHex(),
        },
        // Action group colors for CTA buttons (dark mode)
        actions: {
            // Critical: Slightly lighter for dark mode
            critical: {
                background: colord(BASE_COLORS.amethyst).lighten(0.05).toHex(),
                text: TEXT_COLOR_LIGHT,
                pressed: colord(BASE_COLORS.amethyst).darken(0.1).toHex(),
                shadow: colord(BASE_COLORS.amethyst).alpha(0.3).toHex(),
            },
            // Primary: Slightly lighter for dark mode
            primary: {
                background: colord(BASE_COLORS.ocean).lighten(0.05).toHex(),
                text: TEXT_COLOR_LIGHT,
                pressed: colord(BASE_COLORS.ocean).darken(0.1).toHex(),
                shadow: colord(BASE_COLORS.ocean).alpha(0.3).toHex(),
            },
            // Success: Slightly lighter for dark mode
            success: {
                background: colord(BASE_COLORS.teal).lighten(0.05).toHex(),
                text: TEXT_COLOR_LIGHT,
                pressed: colord(BASE_COLORS.teal).darken(0.1).toHex(),
                shadow: colord(BASE_COLORS.teal).alpha(0.3).toHex(),
            },
        },
    },
    roundness: 8,
};

/**
 * Type export for theme usage with TypeScript
 */
export type AppTheme = typeof AppLightTheme;

/**
 * Helper type for accessing extended theme colors
 */
export type ExtendedTheme = MD3Theme & { colors: ExtendedColors };

/**
 * Default theme (light mode)
 */
export const AppTheme = AppLightTheme;
