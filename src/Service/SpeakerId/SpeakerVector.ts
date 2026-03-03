/** Extracted speaker vector from audio (e.g. Sherpa-ONNX). */
export class SpeakerVector {
    public constructor(
        public vector: number[],
        public confidence: number,
    ) {}
}
