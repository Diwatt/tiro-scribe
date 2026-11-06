/** Languages a therapist can declare for their sessions, as ISO 639-1 codes. */
export class PracticeLanguage {
    public static readonly CODES = ['fr', 'en', 'de', 'es', 'it'] as const;
}

export type PracticeLanguageCode = (typeof PracticeLanguage.CODES)[number];
