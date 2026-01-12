/**
 * Application theme configuration
 * Extends Material Design 3 (MD3) theme with medical/serene color palette
 */

import {MD3LightTheme, MD3DarkTheme} from 'react-native-paper';
import type {MD3Theme} from 'react-native-paper';

/**
 * Medical/Serene color palette
 * Primary: Deep trustworthy Teal (#00695C)
 * Secondary: Calming blue-green tones
 * Tertiary: Soft complementary colors
 */
const medicalColors = {
    primary: '#00695C', // Deep Teal - trustworthy, professional
    onPrimary: '#FFFFFF',
    primaryContainer: '#B2DFDB', // Light teal container
    onPrimaryContainer: '#004D40',
    secondary: '#4A90A4', // Calming blue-green
    onSecondary: '#FFFFFF',
    secondaryContainer: '#B8E0E8',
    onSecondaryContainer: '#1E4A5A',
    tertiary: '#6B9E78', // Soft green accent
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#C8E6D1',
    onTertiaryContainer: '#2E5C3A',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    background: '#FAFAFA', // Very light gray background
    onBackground: '#1A1C1A',
    surface: '#FFFFFF',
    onSurface: '#1A1C1A',
    surfaceVariant: '#DAE5E1',
    onSurfaceVariant: '#3F4946',
    outline: '#6F7976',
    outlineVariant: '#BEC9C5',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#2F312F',
    inverseOnSurface: '#F0F0F0',
    inversePrimary: '#4FD0C0',
    elevation: {
        level0: 'transparent',
        level1: '#F5F5F5',
        level2: '#EEEEEE',
        level3: '#E8E8E8',
        level4: '#E0E0E0',
        level5: '#DADADA',
    },
    surfaceDisabled: 'rgba(26, 28, 26, 0.12)',
    onSurfaceDisabled: 'rgba(26, 28, 26, 0.38)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
};

/**
 * Light theme with medical color palette
 */
export const AppLightTheme: MD3Theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        ...medicalColors,
    },
    roundness: 8, // Slightly rounded corners for modern, approachable feel
};

/**
 * Dark theme with medical color palette (adjusted for dark mode)
 */
export const AppDarkTheme: MD3Theme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: '#4FD0C0', // Lighter teal for dark mode
        onPrimary: '#00332C',
        primaryContainer: '#004D40',
        onPrimaryContainer: '#6FF5E8',
        secondary: '#9CCFD8',
        onSecondary: '#003543',
        secondaryContainer: '#1E4A5A',
        onSecondaryContainer: '#B8E0E8',
        tertiary: '#ACD0B4',
        onTertiary: '#153E25',
        tertiaryContainer: '#2E5C3A',
        onTertiaryContainer: '#C8E6D1',
        error: '#FFB4AB',
        onError: '#690005',
        errorContainer: '#93000A',
        onErrorContainer: '#FFDAD6',
        background: '#1A1C1A',
        onBackground: '#E1E3E1',
        surface: '#1F2120',
        onSurface: '#E1E3E1',
        surfaceVariant: '#3F4946',
        onSurfaceVariant: '#BEC9C5',
        outline: '#899390',
        outlineVariant: '#3F4946',
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#E1E3E1',
        inverseOnSurface: '#2F312F',
        inversePrimary: '#00695C',
        elevation: {
            level0: 'transparent',
            level1: '#2A2C2A',
            level2: '#2F312F',
            level3: '#343634',
            level4: '#363836',
            level5: '#383A38',
        },
        surfaceDisabled: 'rgba(225, 227, 225, 0.12)',
        onSurfaceDisabled: 'rgba(225, 227, 225, 0.38)',
        backdrop: 'rgba(0, 0, 0, 0.5)',
    },
    roundness: 8,
};

/**
 * Type export for theme usage with TypeScript
 */
export type AppTheme = typeof AppLightTheme;

/**
 * Default theme (light mode)
 */
export const AppTheme = AppLightTheme;
