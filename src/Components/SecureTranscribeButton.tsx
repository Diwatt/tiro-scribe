/**
 * SecureTranscribeButton Component
 * Hero CTA button for secure transcription with "Scribe" metaphor
 * Uses Heroicons Solid icons and AppTheme action colors
 */

import React from 'react';
import {StyleSheet, View, Pressable, Text} from 'react-native';
import {useTheme} from 'react-native-paper';
import {LockClosedIcon, ChatBubbleBottomCenterTextIcon} from 'react-native-heroicons/solid';
import type {ExtendedTheme} from '@/theme/AppTheme';

/**
 * Button constants
 */
const BUTTON = {
    HEIGHT: 56,
    SHADOW_OFFSET_HEIGHT: 12,
    SHADOW_OPACITY: 0.6,
    SHADOW_RADIUS: 24,
    ELEVATION: 16,
    ICON_SIZE: 24,
    HORIZONTAL_PADDING: 24,
    MIN_WIDTH: 160,
} as const;

interface SecureTranscribeButtonProps {
    onPress: () => void;
    isRecording: boolean;
}

export function SecureTranscribeButton({
    onPress,
    isRecording,
}: SecureTranscribeButtonProps): React.JSX.Element {
    const theme = useTheme() as ExtendedTheme;
    const actions = theme.colors.actions;

    // Use critical (Amethyst) for idle/hero state, error (Red) for active/recording state
    const heroAction = actions.critical;
    const activeColor = theme.colors.error;

    const backgroundColor = isRecording ? activeColor : heroAction.background;
    const textColor = isRecording ? theme.colors.onError : heroAction.text;
    const shadowColor = heroAction.shadow;

    return (
        <View style={styles.centerHelper}>
            <View style={[styles.shadowWrapper, {shadowColor}]}>
                <Pressable
                    style={[styles.container, {backgroundColor}]}
                    onPress={onPress}
                    android_ripple={{color: heroAction.pressed}}>
                    <View style={styles.content}>
                        {isRecording ? (
                            <LockClosedIcon size={BUTTON.ICON_SIZE} color={textColor} />
                        ) : (
                            <ChatBubbleBottomCenterTextIcon size={BUTTON.ICON_SIZE} color={textColor} />
                        )}
                        <Text style={[styles.label, {color: textColor}]}>
                            {isRecording ? 'Stop' : 'Scribe'}
                        </Text>
                    </View>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    centerHelper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shadowWrapper: {
        shadowOffset: {width: 0, height: BUTTON.SHADOW_OFFSET_HEIGHT},
        shadowOpacity: BUTTON.SHADOW_OPACITY,
        shadowRadius: BUTTON.SHADOW_RADIUS,
        elevation: BUTTON.ELEVATION,
    },
    container: {
        height: BUTTON.HEIGHT,
        minWidth: BUTTON.MIN_WIDTH,
        paddingHorizontal: BUTTON.HORIZONTAL_PADDING,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
