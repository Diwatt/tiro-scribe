import type React from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    children: ReactNode;
    background?: string;
    hasTabBar?: boolean;
    isScrollable?: boolean;
    footer?: ReactNode;
}

/** Paper-colored screen with safe-area padding, optional scroll and a pinned footer. */
export function ScreenFrame({
    children,
    background = PaperInk.PAPER,
    hasTabBar = false,
    isScrollable = true,
    footer,
}: Props): React.JSX.Element {
    const insets = useSafeAreaInsets();
    const bottom = hasTabBar ? Metric.TAB_BAR_CLEARANCE : insets.bottom + 24;
    const content = [STYLES.content, { paddingTop: insets.top + Metric.SCREEN_TOP, paddingBottom: bottom }];

    return (
        <View style={[STYLES.root, { backgroundColor: background }]}>
            {isScrollable ? (
                <ScrollView contentContainerStyle={content} showsVerticalScrollIndicator={false}>
                    {children}
                </ScrollView>
            ) : (
                <View style={[content, STYLES.fill]}>{children}</View>
            )}
            {footer ? <View style={[STYLES.footer, { paddingBottom: insets.bottom + 16 }]}>{footer}</View> : null}
        </View>
    );
}

const STYLES = StyleSheet.create({
    content: { paddingHorizontal: Metric.GUTTER, gap: 14 },
    fill: { flex: 1 },
    footer: { paddingHorizontal: Metric.GUTTER, gap: 10 },
    root: { flex: 1 },
});
