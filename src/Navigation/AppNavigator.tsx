/**
 * Main application navigator
 *
 * Navigation Structure:
 * - MainTabNavigator: Home, Subjects, Settings
 * - RootStack: Modals (RecordingScreen, TranscriptDetail)
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home as HomeIcon, Settings as SettingsIcon, Users } from 'lucide-react-native';
import { useTheme } from 'react-native-paper';
import { Home, RecordingScreen, SettingsScreen, SubjectsScreen, TranscriptDetailScreen } from '@/Screen';
import type { ExtendedTheme } from '@/theme/AppTheme';
import type { MainTabParamList, RootStackParamList } from './types';

const MAIN_TAB = createBottomTabNavigator<MainTabParamList>();
const ROOT_STACK = createNativeStackNavigator<RootStackParamList>();

/**
 * Main Tab Navigator
 * Bottom tab navigation for main app sections
 */
function mainTabNavigator() {
    const theme = useTheme<ExtendedTheme>();
    return (
        <MAIN_TAB.Navigator
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
            <MAIN_TAB.Screen
                name="Home"
                component={Home}
                options={{
                    tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
                }}
            />
            <MAIN_TAB.Screen
                name="Subjects"
                component={SubjectsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
                }}
            />
            <MAIN_TAB.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
                }}
            />
        </MAIN_TAB.Navigator>
    );
}

/**
 * Root Stack Navigator
 * Handles modal screens (Recording, Transcript Detail)
 */
function _rootNavigator() {
    return (
        <ROOT_STACK.Navigator screenOptions={{ headerShown: false }}>
            <ROOT_STACK.Screen name="Main" component={mainTabNavigator} />
            <ROOT_STACK.Screen
                name="Recording"
                component={RecordingScreen}
                options={{
                    presentation: 'fullScreenModal',
                    animation: 'fade',
                }}
            />
            <ROOT_STACK.Screen
                name="TranscriptDetail"
                component={TranscriptDetailScreen}
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }}
            />
        </ROOT_STACK.Navigator>
    );
}

export function AppNavigator() {
    return (
        <NavigationContainer>
            <rootNavigator />
        </NavigationContainer>
    );
}
