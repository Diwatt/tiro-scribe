import { Fact } from '@/Components/Kit/Fact';

describe('Fact', () => {
    it('keeps label and value', () => {
        const fact = Fact.create('Total time', '10 h 08');
        expect(fact.label).toBe('Total time');
        expect(fact.value).toBe('10 h 08');
    });
});
