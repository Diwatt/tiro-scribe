/**
 * WifiVerifier - Handles Wi-Fi connectivity checks and settings redirection.
 */

import * as Network from 'expo-network';
import { Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { ActivityAction } from 'expo-intent-launcher';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';

export class WifiVerifier {
    private readonly logger: AppLogger;

    public constructor() {
        this.logger = Container.get(AppLogger);
    }

    /**
     * Check if Wi-Fi is currently connected.
     */
    public async isConnected(): Promise<boolean> {
        try {
            const networkState = await Network.getNetworkStateAsync();
            return networkState.isConnected === true && networkState.type === Network.NetworkStateType.WIFI;
        } catch {
            return false;
        }
    }

    /**
     * Open system Wi-Fi settings.
     * - iOS: Opens Wi-Fi settings via deep link (App-Prefs:root=WIFI)
     * - Android: Opens Wi-Fi settings directly via expo-intent-launcher
     */
    public async openSettings(): Promise<void> {
        try {
            if (Platform.OS === 'ios') {
                await Linking.openURL('App-Prefs:root=WIFI');
            } else {
                await IntentLauncher.startActivityAsync(ActivityAction.WIFI_SETTINGS);
            }
        } catch (error) {
            this.logger.warn('[WifiVerifier] Could not open Wi-Fi settings', { error });
        }
    }
}