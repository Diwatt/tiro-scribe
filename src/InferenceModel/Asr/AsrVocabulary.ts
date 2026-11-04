export class AsrVocabulary {
    public static readonly SPECIAL_TOKEN_ID_LIMIT = 12;

    public constructor(public readonly pieces: readonly string[]) {}

    public decode(tokenIds: readonly number[]): string {
        let text = '';
        for (const tokenId of tokenIds) {
            if (tokenId < 0 || tokenId >= this.pieces.length) {
                throw new Error(`Vocabulary id ${tokenId} is out of range (0..${this.pieces.length - 1})`);
            }
            if (tokenId < AsrVocabulary.SPECIAL_TOKEN_ID_LIMIT) {
                continue;
            }
            text += this.pieces[tokenId].replaceAll('▁', ' ');
        }

        return text.trim();
    }
}
