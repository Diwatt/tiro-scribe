jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

jest.mock('expo-file-system/legacy', () => ({
    EncodingType: { Base64: 'base64' },
    readAsStringAsync: jest.fn(),
}));

jest.mock('react-native-quick-crypto', () => ({
    Buffer: {
        from: jest.fn(() => new Uint8Array([1, 2, 3])),
    },
}));

import { readAsStringAsync } from 'expo-file-system/legacy';
import { AudioFileReader } from '@/DevConsole/Ingest/AudioFileReader';

const RAW_DEVICE_PATH = '/data/user/0/com.tiroscribe.app/files/speech_thomas_16k.wav';

describe('AudioFileReader', () => {
    it('prefixes raw device paths with the file scheme', async () => {
        (readAsStringAsync as jest.Mock).mockResolvedValue('AQID');
        const reader = new AudioFileReader();

        await reader.readBytes(RAW_DEVICE_PATH);

        expect(readAsStringAsync).toHaveBeenCalledWith(`file://${RAW_DEVICE_PATH}`, { encoding: 'base64' });
    });

    it('keeps paths that already carry the file scheme', async () => {
        (readAsStringAsync as jest.Mock).mockResolvedValue('AQID');
        const reader = new AudioFileReader();

        await reader.readBytes(`file://${RAW_DEVICE_PATH}`);

        expect(readAsStringAsync).toHaveBeenCalledWith(`file://${RAW_DEVICE_PATH}`, { encoding: 'base64' });
    });

    it('returns the decoded bytes', async () => {
        (readAsStringAsync as jest.Mock).mockResolvedValue('AQID');
        const reader = new AudioFileReader();

        const bytes = await reader.readBytes(RAW_DEVICE_PATH);

        expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
    });
});
