/**
 * Tabs layout – Sessions, Subjects, Settings, on a floating translucent bar.
 */

import { Tabs } from 'expo-router';
import { Mic, SlidersHorizontal, Users } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet } from 'react-native';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';

export default function TabsLayout(): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: PaperInk.INK,
                tabBarInactiveTintColor: PaperInk.TEXT_MUTED,
                tabBarActiveBackgroundColor: 'rgba(42,32,27,0.08)',
                tabBarStyle: STYLES.bar,
                tabBarItemStyle: STYLES.item,
                tabBarLabelStyle: STYLES.label,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: LL.shell.tabSessions(),
                    tabBarIcon: ({ color, size }) => <Mic size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="subjects"
                options={{
                    title: LL.shell.tabSubjects(),
                    tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: LL.shell.tabSettings(),
                    tabBarIcon: ({ color, size }) => <SlidersHorizontal size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}

const STYLES = StyleSheet.create({
    bar: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 26,
        height: 66,
        paddingBottom: 0,
        paddingHorizontal: 6,
        borderRadius: 33,
        borderTopWidth: 0,
        backgroundColor: 'rgba(255,253,249,0.94)',
        shadowColor: PaperInk.INK,
        shadowOpacity: 0.16,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    item: { height: 54, marginTop: 6, borderRadius: 27, overflow: 'hidden' },
    label: { fontSize: 11, fontWeight: '600' },
});
