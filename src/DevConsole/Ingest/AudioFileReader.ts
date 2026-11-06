import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { Buffer } from 'react-native-quick-crypto';
import { Container } from '@/Core/Container';

/**
 * AudioFileReader – Reads a raw audio file from disk as bytes.
 * Single responsibility: file system access only, no audio interpretation.
 *
 * DEV ONLY. Not for production use.
 */
export class AudioFileReader {
    private static readonly FILE_SCHEME = 'file://';

    /** expo-file-system APIs require a file:// URI; the console forms accept bare POSIX paths. */
    public static toFileUri(path: string): string {
        return path.startsWith(AudioFileReader.FILE_SCHEME) ? path : `${AudioFileReader.FILE_SCHEME}${path}`;
    }

    public async readBytes(path: string): Promise<Uint8Array> {
        const base64 = await readAsStringAsync(AudioFileReader.toFileUri(path), { encoding: EncodingType.Base64 });
        const bytes = Buffer.from(base64, 'base64');
        return new Uint8Array(bytes);
    }

    public async readText(path: string): Promise<string> {
        return readAsStringAsync(AudioFileReader.toFileUri(path), { encoding: EncodingType.UTF8 });
    }
}

Container.register(AudioFileReader, () => new AudioFileReader());
