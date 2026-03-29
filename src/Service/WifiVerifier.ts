/**
 * WifiVerifier - Handles Wi-Fi connectivity checks and settings redirection.
 */

import * as Network from 'expo-network';
import { Linking, Platform } from 'react-native';

export class WifiVerifier {
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
     * - iOS: Opens Wi-Fi settings via deep link
     * - Android: Opens Wi-Fi settings intent
     */
    public async openSettings(): Promise<void> {
        if (Platform.OS === 'ios') {
            await Linking.openURL('App-Prefs:root=WIFI');
        } else {
            await Linking.openURL('android.settings.WIFI_SETTINGS');
        }
    }
}
