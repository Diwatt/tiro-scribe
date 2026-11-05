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

    public async readBytes(path: string): Promise<Uint8Array> {
        const uri = path.startsWith(AudioFileReader.FILE_SCHEME) ? path : `${AudioFileReader.FILE_SCHEME}${path}`;
        const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
        const bytes = Buffer.from(base64, 'base64');
        return new Uint8Array(bytes);
    }

    public async readText(path: string): Promise<string> {
        const uri = path.startsWith(AudioFileReader.FILE_SCHEME) ? path : `${AudioFileReader.FILE_SCHEME}${path}`;

        return readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
    }
}

Container.register(AudioFileReader, () => new AudioFileReader());
