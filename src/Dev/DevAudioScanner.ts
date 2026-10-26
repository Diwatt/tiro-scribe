import { documentDirectory, getInfoAsync, readDirectoryAsync } from 'expo-file-system/legacy';
import { Container } from '@/Core/Container';
import type { DevAudioFileEntry } from './DevAudioState';

/**
 * DevAudioScanner – Discovers raw audio files in a directory and builds
 * enriched entries with encryption status.
 *
 * DEV ONLY. Not for production use.
 */
export class DevAudioScanner {
    private static readonly AUDIO_EXTENSIONS = new Set([
        '.pcm',
        '.wav',
        '.aiff',
        '.aif',
        '.raw',
    ]);

    public async scan(directory: string): Promise<DevAudioFileEntry[]> {
        const info = await getInfoAsync(directory);
        if (!info.exists) {
            return [];
        }

        const entries = await readDirectoryAsync(directory);
        const sourcePaths = entries
            .filter((name) => {
                const nameLower = name.toLowerCase();
                return Array.from(DevAudioScanner.AUDIO_EXTENSIONS).some((ext) => nameLower.endsWith(ext));
            })
            .map((name) => `${directory}/${name}`);

        const docDir = documentDirectory ?? '';

        return Promise.all(
            sourcePaths.map(async (path) => {
                const name = path.substring(path.lastIndexOf('/') + 1);
                const fileInfo = await getInfoAsync(path);
                const encryptedName = `${name}.dat`;
                const encryptedPath = `${docDir}${encryptedName}`;
                const encryptedInfo = await getInfoAsync(encryptedPath);

                return {
                    name,
                    path,
                    sizeBytes: fileInfo.exists ? (fileInfo.size ?? 0) : 0,
                    encryptedPath: encryptedInfo.exists ? encryptedPath : null,
                    isEncrypted: encryptedInfo.exists,
                };
            }),
        );
    }
}

Container.register(DevAudioScanner, () => new DevAudioScanner());
