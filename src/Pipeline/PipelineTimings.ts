/**
 * PipelineTimings - cumulative wall-clock cost of the pull-pipeline phases
 * across one StreamTranscriber run: native chunk decryption, PCM conversion,
 * per-window VAD, speech cutting and ASR runs.
 */
export class PipelineTimings {
    private asrMs = 0;
    private convertMs = 0;
    private cutMs = 0;
    private decryptMs = 0;
    private vadMs = 0;

    public addAsr(durationMs: number): void {
        this.asrMs += durationMs;
    }

    public addConvert(durationMs: number): void {
        this.convertMs += durationMs;
    }

    public addCut(durationMs: number): void {
        this.cutMs += durationMs;
    }

    /** Pull-loop wall time minus measured JS phases: native decrypt, bridge and reader close. */
    public addDecrypt(durationMs: number): void {
        this.decryptMs += durationMs;
    }

    public addVad(durationMs: number): void {
        this.vadMs += durationMs;
    }

    public getAsrMs(): number {
        return this.asrMs;
    }

    public getConvertMs(): number {
        return this.convertMs;
    }

    public getCutMs(): number {
        return this.cutMs;
    }

    public getDecryptMs(): number {
        return this.decryptMs;
    }

    public getPhasesMs(): number {
        return this.asrMs + this.convertMs + this.cutMs + this.vadMs;
    }

    public getTotalMs(): number {
        return this.decryptMs + this.getPhasesMs();
    }

    public getVadMs(): number {
        return this.vadMs;
    }
}
