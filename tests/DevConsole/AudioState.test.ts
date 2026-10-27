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

import { AudioState } from '@/DevConsole/AudioState';
import { FixtureException } from '@/DevConsole/FixtureException';

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

describe('AudioState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createTherapistFromAudio', () => {
        it('creates the therapist from the audio segment and reports the uuid', async () => {
            const state = createState();
            mockOnboardingFns.createFromAudio.mockResolvedValueOnce({ getUuid: () => 'therapist-uuid-9' });

            await state.createTherapistFromAudio(SOURCE_AUDIO, 0, 2_000);

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

            await expect(state.createTherapistFromAudio('', 0, 2_000)).rejects.toThrow(FixtureException);

            expect(mockOnboardingFns.createFromAudio).not.toHaveBeenCalled();
            expect(state.state$.notification.get()?.type).toBe('error');
        });

        it('rejects a segment where end is not after start', async () => {
            const state = createState();

            await expect(state.createTherapistFromAudio(SOURCE_AUDIO, 2_000, 2_000)).rejects.toThrow(
                FixtureException,
            );

            expect(mockOnboardingFns.createFromAudio).not.toHaveBeenCalled();
        });

        it('reports the onboarding failure through the notification and rethrows', async () => {
            const state = createState();
            mockOnboardingFns.createFromAudio.mockRejectedValueOnce(new Error('Segment starts out of bounds'));

            await expect(state.createTherapistFromAudio(SOURCE_AUDIO, 0, 2_000)).rejects.toThrow(FixtureException);

            expect(state.state$.notification.get()?.type).toBe('error');
            expect(state.state$.lastError.get()).toContain('Segment starts out of bounds');
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
