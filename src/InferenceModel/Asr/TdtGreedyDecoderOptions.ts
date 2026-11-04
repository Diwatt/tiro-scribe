/**
 * Configuration options for {@link TdtGreedyDecoder}, as a dataclass.
 * Built through {@link TdtGreedyDecoderOptions.create}, which applies the
 * documented defaults to any omitted override.
 */
export class TdtGreedyDecoderOptions {
    public static readonly DEFAULT_ENCODER_FRAME_SIZE = 640;
    public static readonly DEFAULT_VOCABULARY_SIZE = 8193;
    public static readonly DEFAULT_BLANK_ID = 8192;
    public static readonly DEFAULT_DURATION_COUNT = 5;

    private constructor(
        public readonly jointLogits: (predState: Float32Array, encoderFrame: Float32Array) => Float32Array,
        public readonly decoderStep: (tokenId: number) => Float32Array,
        public readonly encoderFrameSize: number,
        public readonly vocabularySize: number,
        public readonly blankId: number,
        public readonly durationCount: number,
    ) {}

    public static create(
        jointLogits: (predState: Float32Array, encoderFrame: Float32Array) => Float32Array,
        decoderStep: (tokenId: number) => Float32Array,
        overrides: {
            readonly encoderFrameSize?: number;
            readonly vocabularySize?: number;
            readonly blankId?: number;
            readonly durationCount?: number;
        } = {},
    ): TdtGreedyDecoderOptions {
        return new TdtGreedyDecoderOptions(
            jointLogits,
            decoderStep,
            overrides.encoderFrameSize ?? TdtGreedyDecoderOptions.DEFAULT_ENCODER_FRAME_SIZE,
            overrides.vocabularySize ?? TdtGreedyDecoderOptions.DEFAULT_VOCABULARY_SIZE,
            overrides.blankId ?? TdtGreedyDecoderOptions.DEFAULT_BLANK_ID,
            overrides.durationCount ?? TdtGreedyDecoderOptions.DEFAULT_DURATION_COUNT,
        );
    }
}
