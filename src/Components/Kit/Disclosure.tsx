import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    title: string;
    body: string;
    icon?: LucideIcon;
    isInitiallyOpen?: boolean;
    isDark?: boolean;
}

/** Expandable text block (used for the on-demand mini summary). Open state is pure view state. */
export function Disclosure({ title, body, icon: Icon, isInitiallyOpen = false, isDark = false }: Props): React.JSX.Element {
    const [isOpen, setIsOpen] = useState(isInitiallyOpen);
    const titleColor = isDark ? PaperInk.CARD : PaperInk.TEXT;
    const bodyColor = isDark ? PaperInk.NIGHT_TEXT_SOFT : PaperInk.TEXT_READING;
    const accent = isDark ? PaperInk.ACCENT_ON_DARK : PaperInk.ACCENT;
    const Chevron = isOpen ? ChevronUp : ChevronDown;

    return (
        <View style={STYLES.root}>
            <Pressable
                onPress={() => setIsOpen(!isOpen)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                style={STYLES.header}
            >
                {Icon ? <Icon size={16} color={accent} strokeWidth={2.2} /> : null}
                <Text style={[STYLES.title, { color: titleColor }]}>{title}</Text>
                <Chevron size={16} color={isDark ? PaperInk.ON_DARK_MUTED : PaperInk.CHEVRON} strokeWidth={2.4} />
            </Pressable>
            {isOpen ? <Text style={[STYLES.body, { color: bodyColor }]}>{body}</Text> : null}
        </View>
    );
}

const STYLES = StyleSheet.create({
    body: { fontSize: 15, lineHeight: 21 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
    root: { gap: 6 },
    title: { flex: 1, fontSize: 15, fontWeight: '600' },
});
