import { TdtGreedyDecoder } from '@/InferenceModel/Asr/TdtGreedyDecoder';
import { TdtGreedyDecoderOptions } from '@/InferenceModel/Asr/TdtGreedyDecoderOptions';

const VOCAB_SIZE = 8193;
const BLANK = 8192;
const DURATION_COUNT = 5;
const HIDDEN = 640;

type StepProgram = { tokenId: number; duration: number };

const makeLogits = (program: StepProgram): Float32Array => {
    const logits = new Float32Array(VOCAB_SIZE + DURATION_COUNT).fill(-12);
    logits[program.tokenId] = 12;
    logits[VOCAB_SIZE + program.duration] = 12;
    return logits;
};

const makeDecoder = (
    programs: Map<string, StepProgram>,
): { decoder: TdtGreedyDecoder; decoderStepCalls: number[] } => {
    const decoderStepCalls: number[] = [];
    const decoder = new TdtGreedyDecoder(
        TdtGreedyDecoderOptions.create(
            (predState: Float32Array, encoderFrame: Float32Array): Float32Array => {
                const frameIndex = Math.round(encoderFrame[0]);
                const emission = Math.round(predState[HIDDEN]);
                const program = programs.get(`${frameIndex}:${emission}`);
                if (!program) {
                    throw new Error(`no program for frame ${frameIndex} emission ${emission}`);
                }
                return makeLogits(program);
            },
            (tokenId: number): Float32Array => {
                decoderStepCalls.push(tokenId);

                return new Float32Array(HIDDEN);
            },
        ),
    );
    return { decoder, decoderStepCalls };
};

const makeEncoderFrames = (frameCount: number): Float32Array => {
    const frames = new Float32Array(frameCount * HIDDEN);
    for (let index = 0; index < frameCount; index += 1) {
        frames[index * HIDDEN] = index;
    }
    return frames;
};

describe('TdtGreedyDecoder', () => {
    it('emits tokens with frame positions following the HF greedy TDT semantics', () => {
        const programs = new Map<string, StepProgram>([
            ['0:0', { tokenId: 100, duration: 0 }],
            ['0:1', { tokenId: BLANK, duration: 0 }],
            ['1:0', { tokenId: 200, duration: 2 }],
            ['3:0', { tokenId: BLANK, duration: 4 }],
        ]);
        const { decoder, decoderStepCalls } = makeDecoder(programs);

        const result = decoder.decode(makeEncoderFrames(5));

        expect(result.tokenIds).toEqual([100, 200]);
        expect(result.frameIndexes).toEqual([0, 1]);
        expect(decoderStepCalls).toEqual([BLANK, 100, 200]);
        expect(result.iterationCount).toBe(4);
        expect(result.decoderSteps).toBe(3);
    });

    it('forces forward progress of one frame on a blank with zero duration', () => {
        const programs = new Map<string, StepProgram>([
            ['0:0', { tokenId: BLANK, duration: 0 }],
            ['1:0', { tokenId: BLANK, duration: 1 }],
            ['2:0', { tokenId: BLANK, duration: 3 }],
        ]);
        const { decoder, decoderStepCalls } = makeDecoder(programs);

        const result = decoder.decode(makeEncoderFrames(2));

        expect(result.tokenIds).toEqual([]);
        expect(result.frameIndexes).toEqual([]);
        expect(decoderStepCalls).toEqual([BLANK]);
        expect(result.iterationCount).toBe(2);
        expect(result.decoderSteps).toBe(1);
    });

    it('stops when the frame pointer reaches the last encoder frame', () => {
        const programs = new Map<string, StepProgram>([
            ['0:0', { tokenId: BLANK, duration: 1 }],
            ['1:0', { tokenId: BLANK, duration: 1 }],
            ['2:0', { tokenId: BLANK, duration: 1 }],
        ]);
        const { decoder, decoderStepCalls } = makeDecoder(programs);

        const result = decoder.decode(makeEncoderFrames(3));

        expect(result.tokenIds).toEqual([]);
        expect(result.frameIndexes).toEqual([]);
        expect(decoderStepCalls).toEqual([BLANK]);
        expect(result.iterationCount).toBe(3);
        expect(result.decoderSteps).toBe(1);
    });

    it('emits several tokens on the same frame through zero durations', () => {
        const programs = new Map<string, StepProgram>([
            ['0:0', { tokenId: 10, duration: 0 }],
            ['0:1', { tokenId: 20, duration: 0 }],
            ['0:2', { tokenId: BLANK, duration: 2 }],
            ['2:0', { tokenId: BLANK, duration: 1 }],
            ['3:0', { tokenId: BLANK, duration: 1 }],
        ]);
        const { decoder, decoderStepCalls } = makeDecoder(programs);

        const result = decoder.decode(makeEncoderFrames(4));

        expect(result.tokenIds).toEqual([10, 20]);
        expect(result.frameIndexes).toEqual([0, 0]);
        expect(decoderStepCalls).toEqual([BLANK, 10, 20]);
        expect(result.iterationCount).toBe(5);
        expect(result.decoderSteps).toBe(3);
    });
});
