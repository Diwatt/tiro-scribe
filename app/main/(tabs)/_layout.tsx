/**
 * Tabs layout – Home, Subjects, Settings.
 */

import { Tabs } from 'expo-router';
import { Home as HomeIcon, Settings as SettingsIcon, Users } from 'lucide-react-native';
import type React from 'react';
import { useTheme } from 'react-native-paper';

export default function TabsLayout(): React.JSX.Element {
    const theme = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outlineVariant,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="subjects"
                options={{
                    title: 'Subjects',
                    tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
