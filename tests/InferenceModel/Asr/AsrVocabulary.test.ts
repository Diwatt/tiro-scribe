import fs from 'node:fs';
import path from 'node:path';

import { AsrVocabulary } from '@/InferenceModel/Asr/AsrVocabulary';

const FIXTURES = path.join(__dirname, 'fixtures');
const PIECES = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'asr_vocab.json'), 'utf-8')) as string[];
const DECODE_GOLDEN = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'asr_decode_golden.json'), 'utf-8')) as {
    ids: number[];
    expected: string;
}[];

const createVocabulary = (): AsrVocabulary => new AsrVocabulary(PIECES);

describe('AsrVocabulary', () => {
    it('decodes token ids into text following the Metaspace scheme', () => {
        const vocabulary = createVocabulary();

        for (const golden of DECODE_GOLDEN) {
            expect(vocabulary.decode(golden.ids)).toBe(golden.expected);
        }
    });

    it('skips special tokens during decoding', () => {
        const vocabulary = createVocabulary();
        const golden = DECODE_GOLDEN[0];

        expect(vocabulary.decode([2, 3, 5, ...golden.ids, 1])).toBe(golden.expected);
    });

    it('rejects ids outside the vocabulary', () => {
        const vocabulary = createVocabulary();

        expect(() => vocabulary.decode([PIECES.length])).toThrow(/out of range/i);
    });
});
