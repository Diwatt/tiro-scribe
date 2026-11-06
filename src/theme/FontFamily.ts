import { Platform } from 'react-native';

/** Font families. SCRIPT stands in for Parisienne until its font file is bundled. */
export class FontFamily {
    public static readonly READING = Platform.select({ ios: 'Georgia', default: 'serif' });
    public static readonly SCRIPT = Platform.select({ ios: 'SnellRoundhand', android: 'cursive', default: 'serif' });
}
