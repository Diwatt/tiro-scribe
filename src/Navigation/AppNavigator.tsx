/**
 * Main application navigator
 * 
 * Navigation Structure:
 * - MainTabNavigator: Home, Subjects, Settings
 * - RootStack: Modals (RecordingScreen, TranscriptDetail)
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
    Home,
    SubjectsScreen,
    SettingsScreen,
    RecordingScreen,
    TranscriptDetailScreen,
} from '@/Screens';
import {useTheme} from 'react-native-paper';
import {Home as HomeIcon, Users, Settings as SettingsIcon} from 'lucide-react-native';
import type {RootStackParamList, MainTabParamList} from './types';

const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * Main Tab Navigator
 * Bottom tab navigation for main app sections
 */
function MainTabNavigator() {
    const theme = useTheme();

    return (
        <MainTab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outlineVariant,
                },
            }}>
            <MainTab.Screen
                name="Home"
                component={Home}
                options={{
                    tabBarIcon: ({color, size}) => (
                        <HomeIcon size={size} color={color} />
                    ),
                }}
            />
            <MainTab.Screen
                name="Subjects"
                component={SubjectsScreen}
                options={{
                    tabBarIcon: ({color, size}) => (
                        <Users size={size} color={color} />
                    ),
                }}
            />
            <MainTab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({color, size}) => (
                        <SettingsIcon size={size} color={color} />
                    ),
                }}
            />
        </MainTab.Navigator>
    );
}

/**
 * Root Stack Navigator
 * Handles modal screens (Recording, Transcript Detail)
 */
function RootNavigator() {
    return (
        <RootStack.Navigator screenOptions={{headerShown: false}}>
            <RootStack.Screen
                name="Main"
                component={MainTabNavigator}
            />
            <RootStack.Screen
                name="Recording"
                component={RecordingScreen}
                options={{
                    presentation: 'fullScreenModal',
                    animation: 'fade',
                }}
            />
            <RootStack.Screen
                name="TranscriptDetail"
                component={TranscriptDetailScreen}
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }}
            />
        </RootStack.Navigator>
    );
}

export function AppNavigator() {
    return (
        <NavigationContainer>
            <RootNavigator />
        </NavigationContainer>
    );
}
