/**
 * Navigation Types
 * Defines TypeScript types for React Navigation with proper nesting support
 */

import type {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

/**
 * Main Tab Navigator Param List
 * Bottom tab screens (Home, Subjects, Settings)
 */
export type MainTabParamList = {
    Home: undefined;
    Subjects: undefined;
    Settings: undefined;
};

/**
 * Root Stack Navigator Param List
 * Contains Main (tabs) and modal screens
 */
export type RootStackParamList = {
    Main: NavigatorScreenParams<MainTabParamList>;
    Recording: {autoStart: boolean};
    TranscriptDetail: {transcriptId: string};
};

/**
 * Helper type for Tab screens that need to access Root Stack navigation
 * Combines BottomTabScreenProps and NativeStackScreenProps using CompositeScreenProps
 * 
 * @example
 * ```tsx
 * export function Home({navigation, route}: RootTabScreenProps<'Home'>) {
 *   // Can navigate to Root Stack screens
 *   navigation.navigate('Recording', { autoStart: true });
 * }
 * ```
 */
export type RootTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
>;

/**
 * Helper type for Root Stack screens
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
    RootStackParamList,
    T
>;
