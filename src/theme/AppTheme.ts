/**
 * Application theme configuration (Semantic Naming).
 * Extends Material Design 3 (MD3) with Scribe brand for hierarchy and a
 * semantic palette (error, success, info, processing, pending, warning) for
 * medical/research contexts. All theme colors except the raw primitive hex
 * values are derived via colord (darken, lighten, mix, alpha).
 */

import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';
import type { MD3Theme } from 'react-native-paper';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { SemanticStatusColors, type StatusColors } from './SemanticStatusColors';

extend([mixPlugin]);

// ---------------------------------------------------------------------------
// A. Primitives (The Raw Palette) – internal only, no export
// ---------------------------------------------------------------------------

const PRIMITIVES = {
    // Brand (Scribe)
    espresso: '#4A3B32',
    taupe: '#9C8975',
    teal: '#355052',
    // Rainbow (Pastels)
    yellow: '#FAEDCB',
    mint: '#C9E4DE',
    blue: '#C6DEF1',
    lavender: '#DBCDF0',
    pink: '#F2C6DE',
    peach: '#F7D9C4',
    // Saturated (Actions)
    amethyst: '#8E7CC3',
    ocean: '#5B84B1',
    emerald: '#45B7A0',
} as const;

/**
 * Semantic map: physical primitive → functional role.
 * Usage: error/critical, warning/caution, success/valid, info/neutral,
 * processing/ai, pending/draft.
 */
const SEMANTIC = {
    error: PRIMITIVES.pink,
    warning: PRIMITIVES.yellow,
    success: PRIMITIVES.mint,
    info: PRIMITIVES.blue,
    processing: PRIMITIVES.lavender,
    pending: PRIMITIVES.peach,
} as const;

/** Brand colors from primitives; primaryContainer derived. */
const BRAND = {
    primary: PRIMITIVES.espresso,
    secondary: PRIMITIVES.taupe,
    tertiary: PRIMITIVES.teal,
    primaryContainer: colord(PRIMITIVES.espresso).lighten(0.75).toHex(),
} as const;

/** Neutrals for text/surface (not in PRIMITIVES); used only in derivations. */
const TEXT_COLOR = '#2C2C2C';
const TEXT_COLOR_LIGHT = '#FFFFFF';

// ---------------------------------------------------------------------------
// Extended theme types
// These define the extra keys we add to MD3 (statusIdle, statusError, actions, …).
// ExtendedTheme is what consumers use with useTheme<ExtendedTheme>() for type-safe
// access to theme.colors.statusError, theme.colors.actions, etc.
// ---------------------------------------------------------------------------

interface SecureSessionButtonColors {
    idleBackground: string;
    activeBackground: string;
    waveformColor: string;
    textColor: string;
    iconColor: string;
    idleTextIconColor: string;
    recordingIconColorDark: string;
    recordingIconColorLight: string;
}

interface ActionButtonColors {
    background: string;
    text: string;
    pressed: string;
    shadow: string;
}

interface ActionGroupColors {
    critical: ActionButtonColors;
    primary: ActionButtonColors;
    success: ActionButtonColors;
}

/** MD3 colors + our semantic status and action keys. */
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

// ---------------------------------------------------------------------------
// B. Semantic theme – all derived via colord from PRIMITIVES / SEMANTIC
//
// MD3 color roles (required by React Native Paper's theme shape):
// • background / onBackground     – Screen root; we use in every screen.
// • surface / onSurface           – Cards, headers, content; we use for Card, Surface, list text.
// • surfaceVariant / onSurfaceVariant – Secondary UI (chips, labels, tab bar); we use for banners, labels, placeholders.
// • outline / outlineVariant      – Borders, dividers; we use for inputs, tab bar border.
// • shadow / scrim               – Shadow color; scrim = modal overlay. Paper uses these.
// • inverseSurface / inverseOnSurface / inversePrimary – High-contrast “inverse” surfaces (e.g. FAB, Snackbar). Paper uses these.
// • elevation.level0–5            – Layered surface colors for elevation; Paper’s Surface, Menu, Snackbar use these.
// • surfaceDisabled / onSurfaceDisabled – Disabled controls. Paper uses these.
// Omitting any of these would fall back to MD3 defaults and mix with our palette; we override all for a consistent look.
// ---------------------------------------------------------------------------

const SEMANTIC_THEME = {
    primary: BRAND.primary,
    onPrimary: TEXT_COLOR_LIGHT,
    primaryContainer: BRAND.primaryContainer,
    onPrimaryContainer: BRAND.primary,

    secondary: BRAND.secondary,
    onSecondary: TEXT_COLOR_LIGHT,
    secondaryContainer: SEMANTIC.info,
    onSecondaryContainer: colord(SEMANTIC.info).darken(0.6).toHex(),

    tertiary: BRAND.tertiary,
    onTertiary: TEXT_COLOR_LIGHT,
    tertiaryContainer: SEMANTIC.success,
    onTertiaryContainer: colord(SEMANTIC.success).darken(0.6).toHex(),

    error: colord(SEMANTIC.error).darken(0.6).toHex(),
    onError: TEXT_COLOR_LIGHT,
    errorContainer: colord(SEMANTIC.error).lighten(0.3).toHex(),
    onErrorContainer: colord(SEMANTIC.error).darken(0.7).toHex(),

    background: colord(SEMANTIC.success).lighten(0.95).toHex(),
    onBackground: TEXT_COLOR,
    surface: TEXT_COLOR_LIGHT,
    onSurface: TEXT_COLOR,
    surfaceVariant: colord(SEMANTIC.pending).lighten(0.4).toHex(),
    onSurfaceVariant: colord(TEXT_COLOR).mix(TEXT_COLOR_LIGHT, 0.48).toHex(),
    outline: colord(SEMANTIC.success).darken(0.3).toHex(),
    outlineVariant: colord(SEMANTIC.success).lighten(0.2).toHex(),
    shadow: colord(PRIMITIVES.espresso).darken(0.9).toHex(),
    scrim: colord(PRIMITIVES.espresso).darken(1).alpha(0.5).toHex(),
    inverseSurface: colord(SEMANTIC.success).darken(0.7).toHex(),
    inverseOnSurface: colord(SEMANTIC.success).lighten(0.9).toHex(),
    inversePrimary: SEMANTIC.success,
    elevation: {
        level0: 'transparent',
        level1: colord(SEMANTIC.pending).lighten(0.5).toHex(),
        level2: colord(SEMANTIC.pending).lighten(0.45).toHex(),
        level3: colord(SEMANTIC.pending).lighten(0.4).toHex(),
        level4: colord(SEMANTIC.pending).lighten(0.35).toHex(),
        level5: colord(SEMANTIC.pending).lighten(0.3).toHex(),
    },
    surfaceDisabled: colord(TEXT_COLOR).mix(TEXT_COLOR_LIGHT, 0.12).toHex(),
    onSurfaceDisabled: colord(TEXT_COLOR).mix(TEXT_COLOR_LIGHT, 0.38).toHex(),
    backdrop: colord(PRIMITIVES.espresso).alpha(0.5).toHex(),

    statusIdle: new SemanticStatusColors(SEMANTIC.success).light(TEXT_COLOR),
    statusProcessing: new SemanticStatusColors(SEMANTIC.processing).light(TEXT_COLOR),
    statusBatchWaiting: new SemanticStatusColors(SEMANTIC.pending).light(TEXT_COLOR),
    statusSetup: new SemanticStatusColors(SEMANTIC.info).light(TEXT_COLOR),
    statusError: new SemanticStatusColors(SEMANTIC.error).light(TEXT_COLOR),
    statusWarning: new SemanticStatusColors(SEMANTIC.warning).light(TEXT_COLOR),

    secureSessionButton: {
        idleBackground: SEMANTIC.pending,
        activeBackground: SEMANTIC.error,
        waveformColor: SEMANTIC.processing,
        textColor: TEXT_COLOR,
        iconColor: TEXT_COLOR_LIGHT,
        idleTextIconColor: colord(SEMANTIC.pending).darken(0.65).toHex(),
        recordingIconColorDark: colord(SEMANTIC.error).darken(0.65).toHex(),
        recordingIconColorLight: colord(SEMANTIC.error).darken(0.15).toHex(),
    },

    actions: {
        critical: {
            background: PRIMITIVES.amethyst,
            text: TEXT_COLOR_LIGHT,
            pressed: colord(PRIMITIVES.amethyst).darken(0.15).toHex(),
            shadow: colord(PRIMITIVES.amethyst).lighten(0.2).alpha(0.5).toHex(),
        },
        primary: {
            background: BRAND.primary,
            text: TEXT_COLOR_LIGHT,
            pressed: colord(BRAND.primary).darken(0.15).toHex(),
            shadow: colord(BRAND.primary).lighten(0.2).alpha(0.5).toHex(),
        },
        success: {
            background: PRIMITIVES.emerald,
            text: TEXT_COLOR_LIGHT,
            pressed: colord(PRIMITIVES.emerald).darken(0.15).toHex(),
            shadow: colord(PRIMITIVES.emerald).lighten(0.2).alpha(0.5).toHex(),
        },
    },
};

// ---------------------------------------------------------------------------
// Light theme
// ---------------------------------------------------------------------------

export const APP_LIGHT_THEME: MD3Theme & { colors: ExtendedColors } = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        ...SEMANTIC_THEME,
    },
    roundness: 8,
};

// ---------------------------------------------------------------------------
// Dark theme – all derived via colord from same primitives/semantic
// ---------------------------------------------------------------------------

const DARK_SURFACE = colord(SEMANTIC.success).darken(0.83).toHex();
const DARK_SURFACE_LIGHT = colord(SEMANTIC.success).lighten(0.8).toHex();

export const APP_DARK_THEME: MD3Theme & { colors: ExtendedColors } = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: colord(BRAND.primary).lighten(0.15).toHex(),
        onPrimary: TEXT_COLOR_LIGHT,
        primaryContainer: colord(BRAND.primary).darken(0.3).toHex(),
        onPrimaryContainer: colord(BRAND.primaryContainer).darken(0.2).toHex(),

        secondary: colord(BRAND.secondary).lighten(0.15).toHex(),
        onSecondary: TEXT_COLOR_LIGHT,
        secondaryContainer: colord(SEMANTIC.info).darken(0.6).toHex(),
        onSecondaryContainer: colord(SEMANTIC.info).lighten(0.5).toHex(),

        tertiary: colord(BRAND.tertiary).lighten(0.2).toHex(),
        onTertiary: TEXT_COLOR_LIGHT,
        tertiaryContainer: colord(SEMANTIC.success).darken(0.6).toHex(),
        onTertiaryContainer: colord(SEMANTIC.success).lighten(0.4).toHex(),

        error: colord(SEMANTIC.error).lighten(0.3).toHex(),
        onError: colord(SEMANTIC.error).darken(0.8).toHex(),
        errorContainer: colord(SEMANTIC.error).darken(0.7).toHex(),
        onErrorContainer: colord(SEMANTIC.error).lighten(0.4).toHex(),

        background: colord(SEMANTIC.success).darken(0.85).toHex(),
        onBackground: DARK_SURFACE_LIGHT,
        surface: DARK_SURFACE,
        onSurface: DARK_SURFACE_LIGHT,
        surfaceVariant: colord(SEMANTIC.pending).darken(0.7).toHex(),
        onSurfaceVariant: colord(TEXT_COLOR_LIGHT).mix(DARK_SURFACE, 0.35).toHex(),
        outline: colord(SEMANTIC.success).lighten(0.4).toHex(),
        outlineVariant: colord(SEMANTIC.success).darken(0.7).toHex(),
        shadow: colord(PRIMITIVES.espresso).darken(1).toHex(),
        scrim: colord(PRIMITIVES.espresso).alpha(0.5).toHex(),
        inverseSurface: colord(SEMANTIC.success).lighten(0.8).toHex(),
        inverseOnSurface: colord(SEMANTIC.success).darken(0.7).toHex(),
        inversePrimary: SEMANTIC.success,
        elevation: {
            level0: 'transparent',
            level1: colord(SEMANTIC.success).darken(0.8).toHex(),
            level2: colord(SEMANTIC.success).darken(0.78).toHex(),
            level3: colord(SEMANTIC.success).darken(0.76).toHex(),
            level4: colord(SEMANTIC.success).darken(0.74).toHex(),
            level5: colord(SEMANTIC.success).darken(0.72).toHex(),
        },
        surfaceDisabled: colord(DARK_SURFACE_LIGHT).mix(DARK_SURFACE, 0.12).toHex(),
        onSurfaceDisabled: colord(DARK_SURFACE_LIGHT).mix(DARK_SURFACE, 0.38).toHex(),
        backdrop: colord(PRIMITIVES.espresso).alpha(0.5).toHex(),

        statusIdle: new SemanticStatusColors(SEMANTIC.success).dark(TEXT_COLOR_LIGHT),
        statusProcessing: new SemanticStatusColors(SEMANTIC.processing).dark(TEXT_COLOR_LIGHT),
        statusBatchWaiting: new SemanticStatusColors(SEMANTIC.pending).dark(TEXT_COLOR_LIGHT),
        statusSetup: new SemanticStatusColors(SEMANTIC.info).dark(TEXT_COLOR_LIGHT),
        statusError: new SemanticStatusColors(SEMANTIC.error).dark(TEXT_COLOR_LIGHT),
        statusWarning: new SemanticStatusColors(SEMANTIC.warning).dark(TEXT_COLOR_LIGHT),

        secureSessionButton: {
            idleBackground: colord(SEMANTIC.pending).darken(0.7).toHex(),
            activeBackground: SEMANTIC.error,
            waveformColor: colord(SEMANTIC.processing).darken(0.5).toHex(),
            textColor: colord(SEMANTIC.pending).lighten(0.8).toHex(),
            iconColor: TEXT_COLOR_LIGHT,
            idleTextIconColor: colord(colord(SEMANTIC.pending).darken(0.7).toHex()).darken(0.65).toHex(),
            recordingIconColorDark: colord(SEMANTIC.error).darken(0.65).toHex(),
            recordingIconColorLight: colord(SEMANTIC.error).darken(0.15).toHex(),
        },

        actions: {
            critical: {
                background: colord(PRIMITIVES.amethyst).lighten(0.05).toHex(),
                text: TEXT_COLOR_LIGHT,
                pressed: colord(PRIMITIVES.amethyst).darken(0.1).toHex(),
                shadow: colord(PRIMITIVES.amethyst).alpha(0.3).toHex(),
            },
            primary: {
                background: colord(BRAND.primary).lighten(0.05).toHex(),
                text: TEXT_COLOR_LIGHT,
                pressed: colord(BRAND.primary).darken(0.1).toHex(),
                shadow: colord(BRAND.primary).alpha(0.3).toHex(),
            },
            success: {
                background: colord(PRIMITIVES.emerald).lighten(0.05).toHex(),
                text: TEXT_COLOR_LIGHT,
                pressed: colord(PRIMITIVES.emerald).darken(0.1).toHex(),
                shadow: colord(PRIMITIVES.emerald).alpha(0.3).toHex(),
            },
        },
    },
    roundness: 8,
};

export type AppTheme = typeof APP_LIGHT_THEME;
export type ExtendedTheme = MD3Theme & { colors: ExtendedColors };
export const APP_THEME = APP_LIGHT_THEME;
