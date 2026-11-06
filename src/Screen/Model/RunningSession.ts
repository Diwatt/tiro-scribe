import type { AnalysisStage } from './AnalysisStage';

/** The session currently being transcribed, with its stages and progress of the running one. */
export class RunningSession {
    private constructor(
        public readonly label: string,
        public readonly duration: string,
        public readonly stages: ReadonlyArray<AnalysisStage>,
        public readonly runningProgress: number,
    ) {}

    public static create(
        label: string,
        duration: string,
        stages: ReadonlyArray<AnalysisStage>,
        runningProgress: number,
    ): RunningSession {
        return new RunningSession(label, duration, stages, Math.min(1, Math.max(0, runningProgress)));
    }
}
