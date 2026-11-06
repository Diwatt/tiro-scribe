import { documentDirectory, getInfoAsync, readDirectoryAsync } from 'expo-file-system/legacy';
import { Container } from '@/Core/Container';
import { AudioFileEntry } from '../Data/AudioFileEntry';
import { AudioFileReader } from './AudioFileReader';

/**
 * AudioScanner – Discovers raw audio files in a directory and builds
 * enriched entries with encryption status.
 *
 * DEV ONLY. Not for production use.
 */
export class AudioScanner {
    private static readonly AUDIO_EXTENSIONS = new Set(['.pcm', '.wav', '.aiff', '.aif', '.raw']);

    public async scan(directory: string): Promise<AudioFileEntry[]> {
        const directoryUri = AudioFileReader.toFileUri(directory);
        const info = await getInfoAsync(directoryUri);
        if (!info.exists) {
            return [];
        }

        const entries = await readDirectoryAsync(directoryUri);
        const sourcePaths = entries
            .filter((name) => {
                const nameLower = name.toLowerCase();
                return Array.from(AudioScanner.AUDIO_EXTENSIONS).some((ext) => nameLower.endsWith(ext));
            })
            .map((name) => `${directory}/${name}`);

        const docDir = documentDirectory ?? '';

        return Promise.all(
            sourcePaths.map(async (path) => {
                const name = path.substring(path.lastIndexOf('/') + 1);
                const fileInfo = await getInfoAsync(AudioFileReader.toFileUri(path));
                const encryptedName = `${name}.dat`;
                const encryptedPath = `${docDir}${encryptedName}`;
                const encryptedInfo = await getInfoAsync(AudioFileReader.toFileUri(encryptedPath));

                return AudioFileEntry.create(
                    name,
                    path,
                    fileInfo.exists ? (fileInfo.size ?? 0) : 0,
                    encryptedInfo.exists ? encryptedPath : null,
                    encryptedInfo.exists,
                    null,
                );
            }),
        );
    }
}

Container.register(AudioScanner, () => new AudioScanner());
