import type { Speaker } from '@/Components/Kit';

/** One utterance of a transcript, attributed to a speaker. */
export class TranscriptLine {
    private constructor(
        public readonly speaker: Speaker,
        public readonly text: string,
        public readonly time: string,
    ) {}

    public static create(speaker: Speaker, text: string, time: string): TranscriptLine {
        return new TranscriptLine(speaker, text, time);
    }

    public static isFirstOfGroup(lines: ReadonlyArray<TranscriptLine>, index: number): boolean {
        const previous = lines[index - 1];

        return !previous || previous.speaker !== lines[index].speaker;
    }

    public static isLastOfGroup(lines: ReadonlyArray<TranscriptLine>, index: number): boolean {
        const next = lines[index + 1];

        return !next || next.speaker !== lines[index].speaker;
    }
}
