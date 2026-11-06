import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useState } from 'react';
import { SettingsHomeScreen } from './Setting/SettingsHomeScreen';

/** Settings tab. Tapping "About" five times opens the developer console. */
export function SettingsScreen(): React.JSX.Element {
    const router = useRouter();
    const [aboutTapCount, setAboutTapCount] = useState(0);
    const requiredTaps = 5;

    const handleAbout = (): void => {
        const nextCount = aboutTapCount + 1;
        setAboutTapCount(nextCount >= requiredTaps ? 0 : nextCount);
        if (nextCount >= requiredTaps) {
            router.push('/dev-console');
        }
    };

    return (
        <SettingsHomeScreen
            initials=""
            profileDetail=""
            securityValue=""
            storageValue=""
            processingValue=""
            version={Constants.expoConfig?.version ?? ''}
            onAbout={handleAbout}
        />
    );
}

