import { TiroScribeException } from '@/Exception/TiroScribeException';
import { RecordingTooShortError } from '@/Exception/RecordingTooShortError';

describe('RecordingTooShortError', () => {
    it('is a TiroScribeException', () => {
        const error = new RecordingTooShortError(80_000, 5_000);

        expect(error).toBeInstanceOf(TiroScribeException);
    });

    it('carries the RECORDING_TOO_SHORT code', () => {
        const error = new RecordingTooShortError(80_000, 5_000);

        expect(error.code).toBe('RECORDING_TOO_SHORT');
    });

    it('sets its own class name', () => {
        const error = new RecordingTooShortError(80_000, 5_000);

        expect(error.name).toBe('RecordingTooShortError');
    });

    it('describes requested versus actual samples in the message', () => {
        const error = new RecordingTooShortError(80_000, 5_000);

        expect(error.message).toBe('Recording too short: requested 80000 samples but got 5000');
    });
});
