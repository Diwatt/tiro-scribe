/** A selectable session language: ISO code and display label. */
export class LanguageOption {
    private constructor(
        public readonly code: string,
        public readonly label: string,
    ) {}

    public static create(code: string, label: string): LanguageOption {
        return new LanguageOption(code, label);
    }
}
