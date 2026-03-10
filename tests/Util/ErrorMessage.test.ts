/**
 * Unit tests for the ErrorMessage helper.
 */
import { describe, it, expect } from 'vitest';
import { ErrorMessage } from '@/Util/ErrorMessage';

describe('ErrorMessage', () => {
    it('returns message for Error instances', () => {
        const err = new Error('oops');
        expect(ErrorMessage.toString(err)).toBe('oops');
    });

    it('returns strings unchanged', () => {
        expect(ErrorMessage.toString('hello')).toBe('hello');
    });

    it('stringifies objects', () => {
        const obj = { foo: 'bar' };
        expect(ErrorMessage.toString(obj)).toBe(JSON.stringify(obj));
    });

    it('falls back to String() when stringify fails', () => {
        const circular: any = {};
        circular.self = circular;
        expect(ErrorMessage.toString(circular)).toBe(String(circular));
    });
});
