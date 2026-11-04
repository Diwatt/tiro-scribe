const mockFixtureLoaderFns = {
    load: jest.fn(),
};

const mockTherapistRepoFns = {
    findCurrent: jest.fn(),
};

const mockOnboardingFns = {
    createFromAudio: jest.fn(),
};

jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

import { AudioState } from '@/DevConsole/State/AudioState';
import { AudioFileEntry } from '@/DevConsole/Data/AudioFileEntry';
import { FixtureException } from '@/DevConsole/Fixture/FixtureException';

const SOURCE_AUDIO = '/documents/scene_01.wav';
const ENCRYPTED_PATH = '/documents/fixture_abc123.dat';

const createState = (): AudioState =>
    new AudioState(
        {} as never,
        {} as never,
        mockFixtureLoaderFns as never,
        mockTherapistRepoFns as never,
        mockOnboardingFns as never,
        { error: jest.fn() } as never,
    );

const fillTherapistForm = (state: AudioState, sourcePath: string, start: string, end: string): void => {
    state.setTherapistSourcePath(sourcePath);
    state.setSegmentStart(start);
    state.setSegmentEnd(end);
};

describe('AudioState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createTherapistFromAudio', () => {
        it('creates the therapist from the form fields and reports the uuid', async () => {
            const state = createState();
            fillTherapistForm(state, SOURCE_AUDIO, '0', '2000');
            mockOnboardingFns.createFromAudio.mockResolvedValueOnce({ getUuid: () => 'therapist-uuid-9' });

            await state.createTherapistFromAudio();

            expect(mockOnboardingFns.createFromAudio).toHaveBeenCalledTimes(1);
            expect(mockOnboardingFns.createFromAudio).toHaveBeenCalledWith(
                SOURCE_AUDIO,
                expect.objectContaining({ startMs: 0, endMs: 2_000 }),
                expect.objectContaining({ email: 'dev@tiro-scribe.local' }),
            );
            expect(state.lastTherapistUuid).toBe('therapist-uuid-9');
            expect(state.state$.notification.get()).toEqual({
                message: 'Therapist created: therapist-uuid-9',
                type: 'success',
            });
        });

        it('rejects an empty source audio path without calling the onboarding', async () => {
            const state = createState();
            fillTherapistForm(state, '', '0', '2000');

            await expect(state.createTherapistFromAudio()).rejects.toThrow(FixtureException);

            expect(mockOnboardingFns.createFromAudio).not.toHaveBeenCalled();
            expect(state.state$.notification.get()?.type).toBe('error');
        });

        it('rejects a segment where end is not after start', async () => {
            const state = createState();
            fillTherapistForm(state, SOURCE_AUDIO, '2000', '2000');

            await expect(state.createTherapistFromAudio()).rejects.toThrow(FixtureException);

            expect(mockOnboardingFns.createFromAudio).not.toHaveBeenCalled();
        });

        it('reports the onboarding failure through the notification and rethrows', async () => {
            const state = createState();
            fillTherapistForm(state, SOURCE_AUDIO, '0', '2000');
            mockOnboardingFns.createFromAudio.mockRejectedValueOnce(new Error('Segment starts out of bounds'));

            await expect(state.createTherapistFromAudio()).rejects.toThrow(FixtureException);

            expect(state.state$.notification.get()?.type).toBe('error');
            expect(state.state$.lastError.get()).toContain('Segment starts out of bounds');
        });
    });

    describe('isTherapistFormValid', () => {
        it('accepts a source path with a start before the end', () => {
            const state = createState();
            fillTherapistForm(state, SOURCE_AUDIO, '0', '2000');

            expect(state.isTherapistFormValid).toBe(true);
        });

        it('rejects an empty source path', () => {
            const state = createState();
            fillTherapistForm(state, '', '0', '2000');

            expect(state.isTherapistFormValid).toBe(false);
        });

        it('rejects a non-numeric segment bound', () => {
            const state = createState();
            fillTherapistForm(state, SOURCE_AUDIO, 'abc', '2000');

            expect(state.isTherapistFormValid).toBe(false);
        });

        it('rejects a segment where end is not after start', () => {
            const state = createState();
            fillTherapistForm(state, SOURCE_AUDIO, '2000', '2000');

            expect(state.isTherapistFormValid).toBe(false);
        });
    });

    describe('firstUnencryptedPath', () => {
        it('returns the first file that is not encrypted', () => {
            const state = createState();
            state.state$.files.set([
                AudioFileEntry.create('a.wav', '/a.wav', 1, '/a.dat', true, 1),
                AudioFileEntry.create('b.wav', '/b.wav', 2, null, false, null),
            ]);

            expect(state.firstUnencryptedPath).toBe('/b.wav');
        });

        it('returns an empty string when every file is encrypted', () => {
            const state = createState();
            state.state$.files.set([AudioFileEntry.create('a.wav', '/a.wav', 1, '/a.dat', true, 1)]);

            expect(state.firstUnencryptedPath).toBe('');
        });
    });

    describe('loadEncounterFixture', () => {
        it('resolves the current therapist and loads the fixture with its id', async () => {
            const state = createState();
            mockTherapistRepoFns.findCurrent.mockResolvedValueOnce({ getUuid: () => 'therapist-uuid-1' });
            const fakeFixture = { summary: 'encounter=enc-1 patient=pat-1 queueItem=q-1' };
            mockFixtureLoaderFns.load.mockResolvedValueOnce(fakeFixture);

            await state.loadEncounterFixture(ENCRYPTED_PATH, 65_000);

            expect(mockFixtureLoaderFns.load).toHaveBeenCalledWith('therapist-uuid-1', ENCRYPTED_PATH, 65_000);
            expect(state.lastFixture).toBe(fakeFixture);
            expect(state.state$.notification.get()?.type).toBe('success');
        });

        it('rejects with THERAPIST_NOT_FOUND when no therapist is persisted', async () => {
            const state = createState();
            mockTherapistRepoFns.findCurrent.mockResolvedValueOnce(undefined);

            await expect(state.loadEncounterFixture(ENCRYPTED_PATH, 65_000)).rejects.toThrow(
                'No persisted therapist. Run the dev therapist onboarding first.',
            );

            expect(mockFixtureLoaderFns.load).not.toHaveBeenCalled();
        });

        it('reports the fixture load failure through the notification and rethrows', async () => {
            const state = createState();
            mockTherapistRepoFns.findCurrent.mockResolvedValueOnce({ getUuid: () => 'therapist-uuid-1' });
            mockFixtureLoaderFns.load.mockRejectedValueOnce(new Error('db is locked'));

            await expect(state.loadEncounterFixture(ENCRYPTED_PATH, 65_000)).rejects.toThrow(FixtureException);

            expect(state.state$.notification.get()?.type).toBe('error');
        });
    });
});
