/** A labelled value shown in a fact grid (e.g. "First session" / "11 March"). */
export class Fact {
    private constructor(
        public readonly label: string,
        public readonly value: string,
    ) {}

    public static create(label: string, value: string): Fact {
        return new Fact(label, value);
    }
}
