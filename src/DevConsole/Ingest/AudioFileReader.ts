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
    public async readBytes(path: string): Promise<Uint8Array> {
        const base64 = await readAsStringAsync(path, { encoding: EncodingType.Base64 });
        const bytes = Buffer.from(base64, 'base64');
        return new Uint8Array(bytes);
    }
}

Container.register(AudioFileReader, () => new AudioFileReader());
