import { SourceIngestException } from './SourceIngestException';

/**
 * WavHeader – Parsed RIFF/WAVE file header.
 *
 * Immutable value object produced by {@link WavHeader.fromBytes}.
 * Only PCM format 1 with 16-bit samples is supported.
 *
 * DEV ONLY. Not for production use.
 */
export class WavHeader {
    public static readonly PCM_FORMAT = 1;
    public static readonly BITS_PER_SAMPLE = 16;
    public static readonly MONO_CHANNELS = 1;
    public static readonly STEREO_CHANNELS = 2;

    public readonly audioFormat: number;
    public readonly channels: number;
    public readonly sampleRate: number;
    public readonly bitsPerSample: number;
    public readonly dataOffset: number;
    public readonly dataSize: number;

    private constructor(
        audioFormat: number,
        channels: number,
        sampleRate: number,
        bitsPerSample: number,
        dataOffset: number,
        dataSize: number,
    ) {
        this.audioFormat = audioFormat;
        this.channels = channels;
        this.sampleRate = sampleRate;
        this.bitsPerSample = bitsPerSample;
        this.dataOffset = dataOffset;
        this.dataSize = dataSize;
    }

    /**
     * Parse a WAV header from raw bytes.
     *
     * @throws {SourceIngestException} If the file is not a valid WAV or has no data chunk.
     */
    public static fromBytes(bytes: Uint8Array): WavHeader {
        const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

        let offset = 12; // Skip RIFF header

        let audioFormat = 0;
        let channels = 0;
        let sampleRate = 0;
        let bitsPerSample = 0;
        let dataOffset = 0;
        let dataSize = 0;

        while (offset < bytes.byteLength - 8) {
            const chunkId = String.fromCharCode(
                bytes[offset],
                bytes[offset + 1],
                bytes[offset + 2],
                bytes[offset + 3],
            );
            const chunkSize = dataView.getUint32(offset + 4, true);

            if (chunkId === 'fmt ') {
                audioFormat = dataView.getUint16(offset + 8, true);
                channels = dataView.getUint16(offset + 10, true);
                sampleRate = dataView.getUint32(offset + 12, true);
                bitsPerSample = dataView.getUint16(offset + 22, true);
            } else if (chunkId === 'data') {
                dataOffset = offset + 8;
                dataSize = chunkSize;
                break;
            }

            offset += 8 + chunkSize;
            if (chunkSize % 2 === 1) {
                offset += 1; // Pad byte
            }
        }

        if (dataOffset === 0) {
            throw new SourceIngestException('WAV file has no data chunk', 'INVALID_WAV_FILE');
        }

        return new WavHeader(audioFormat, channels, sampleRate, bitsPerSample, dataOffset, dataSize);
    }

    public get isPcm(): boolean {
        return this.audioFormat === WavHeader.PCM_FORMAT;
    }

    public get isSupportedBitDepth(): boolean {
        return this.bitsPerSample === WavHeader.BITS_PER_SAMPLE;
    }

    public get isSupportedChannels(): boolean {
        return this.channels === WavHeader.MONO_CHANNELS || this.channels === WavHeader.STEREO_CHANNELS;
    }
}
