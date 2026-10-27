jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

jest.mock('expo-file-system/legacy', () => ({
    getInfoAsync: jest.fn(),
}));

import { TherapistOnboarding } from '@/DevConsole/TherapistOnboarding';
import { SourceIngestException } from '@/DevConsole/SourceIngestException';
import { AudioSegment } from '@/DevConsole/Data/AudioSegment';
import type { FileInfo } from 'expo-file-system/legacy';
import { getInfoAsync } from 'expo-file-system/legacy';

const mockGetInfoAsync = jest.mocked(getInfoAsync);

const existingFile = (size: number, uri: string = 'file:///mock'): FileInfo => ({
    uri,
    exists: true,
    isDirectory: false,
    size,
    modificationTime: 0,
});

const missingFile = (): FileInfo => ({
    uri: 'file:///mock',
    exists: false,
    isDirectory: false,
});

const SOURCE_AUDIO = '/data/user/0/files/scene_01.wav';
const SEGMENT = new AudioSegment(5_000, 35_000);
const THERAPIST_INPUT = {
    email: 'dev@tiro-scribe.local',
    password: 'dev-password-123',
    languages: ['fr'],
    qualifications: ['Psychiatrist'],
    experience: '5',
    methods: ['CBT'],
};

const createDeps = () => {
    const therapist = {
        uuid: 'therapist-uuid-7',
        email: 'dev@tiro-scribe.local',
        setBiocode: jest.fn(),
    };
    const forge = { create: jest.fn().mockReturnValue({ therapist, artifacts: { masterKey: 'master-key' } }) };
    const vault = { save: jest.fn().mockResolvedValue(undefined) };
    const calibrator = {
        generateBiocode: jest.fn().mockResolvedValue({ projectedVector: [0.1, 0.2, 0.3], confidence: 0.98 }),
    };
    const segmentExtractor = { extract: jest.fn().mockResolvedValue(new Float32Array(480)) };
    const repository = { persist: jest.fn().mockResolvedValue(undefined) };
    const registry = { getRepository: jest.fn().mockReturnValue(repository) };
    const logger = { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() };

    return {
        therapist,
        forge,
        vault,
        calibrator,
        segmentExtractor,
        repository,
        registry,
        logger,
        onboarding: new TherapistOnboarding(
            forge as never,
            vault as never,
            calibrator as never,
            segmentExtractor as never,
            registry as never,
            logger as never,
        ),
    };
};

describe('TherapistOnboarding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetInfoAsync.mockResolvedValue(existingFile(96_078));
    });

    it('creates, calibrates and persists the therapist from the audio segment', async () => {
        const deps = createDeps();

        const therapist = await deps.onboarding.createFromAudio(SOURCE_AUDIO, SEGMENT, THERAPIST_INPUT);

        expect(deps.forge.create).toHaveBeenCalledWith(THERAPIST_INPUT);
        expect(deps.segmentExtractor.extract).toHaveBeenCalledWith(SOURCE_AUDIO, SEGMENT);
        expect(deps.calibrator.generateBiocode).toHaveBeenCalledWith(
            'master-key',
            expect.any(Float32Array),
        );
        expect(deps.therapist.setBiocode).toHaveBeenCalledWith([0.1, 0.2, 0.3]);
        expect(deps.repository.persist).toHaveBeenCalledWith(therapist);
        expect(deps.vault.save).toHaveBeenCalledWith('therapist-uuid-7', 'master-key');
    });

    it('rejects with AUDIO_FILE_MISSING when the source file does not exist', async () => {
        mockGetInfoAsync.mockResolvedValue(missingFile());
        const deps = createDeps();

        await expect(deps.onboarding.createFromAudio(SOURCE_AUDIO, SEGMENT, THERAPIST_INPUT)).rejects.toThrow(
            SourceIngestException,
        );
        await expect(deps.onboarding.createFromAudio(SOURCE_AUDIO, SEGMENT, THERAPIST_INPUT)).rejects.toThrow(
            'Audio file not found',
        );

        expect(deps.forge.create).not.toHaveBeenCalled();
    });

    it('rejects with INVALID_SEGMENT when the segment is invalid', async () => {
        const deps = createDeps();

        await expect(
            deps.onboarding.createFromAudio(SOURCE_AUDIO, new AudioSegment(35_000, 5_000), THERAPIST_INPUT),
        ).rejects.toThrow('Invalid segment');

        expect(deps.forge.create).not.toHaveBeenCalled();
        expect(deps.segmentExtractor.extract).not.toHaveBeenCalled();
    });
});
