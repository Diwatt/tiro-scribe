import { StageState } from './StageState';

/** One stage of a session analysis (decryption, transcription, speakers…). */
export class AnalysisStage {
    private constructor(
        public readonly title: string,
        public readonly detail: string,
        public readonly state: StageState,
    ) {}

    public static create(title: string, detail: string, state: StageState): AnalysisStage {
        return new AnalysisStage(title, detail, state);
    }

    public needsAnswer(): boolean {
        return this.state === StageState.Ask;
    }
}
