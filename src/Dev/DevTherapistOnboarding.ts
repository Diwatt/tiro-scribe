import { getInfoAsync } from 'expo-file-system/legacy';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Registry } from '@/Database/Registry';
import { Therapist } from '@/Entity/Therapist';
import { VoiceCalibrator } from '@/InferenceModel/Speaker/VoiceCalibrator';
import type { TherapistRepository } from '@/Repository/TherapistRepository';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import type { CreateTherapistInput } from '@/Security/TherapistForge';
import { TherapistForge } from '@/Security/TherapistForge';
import type { AudioSegment } from './Data/AudioSegment';
import { DevAudioSegmentExtractor } from './DevAudioSegmentExtractor';
import { DevEncryptionException } from './DevEncryptionException';

/**
 * DevTherapistOnboarding – Creates a dev therapist with a biocode extracted
 * from an audio file segment.
 *
 * Flow:
 *   1. Read raw audio file → PCM (via DevAudioSegmentExtractor)
 *   2. Extract time-based segment → PCM segment
 *   3. PCM → biocode (via VoiceCalibrator)
 *   4. Persist therapist + store master key
 *
 * Usage:
 *   const onboarding = Container.get(DevTherapistOnboarding);
 *   const therapist = await onboarding.createFromAudio(
 *     '/path/to/encounter.wav',
 *     { startMs: 5000, endMs: 35000 },
 *     {
 *       email: 'dev@example.com',
 *       password: 'password',
 *       languages: ['en'],
 *       qualifications: ['Therapist'],
 *       experience: '5',
 *       methods: ['CBT'],
 *     },
 *   );
 *
 * DEV ONLY. Not for production use.
 */
export class DevTherapistOnboarding {
    public constructor(
        private readonly therapistForge: TherapistForge,
        private readonly vault: MasterKeyVault,
        private readonly voiceCalibrator: VoiceCalibrator,
        private readonly segmentExtractor: DevAudioSegmentExtractor,
        private readonly registry: Registry,
        private readonly logger: AppLogger,
    ) {}

    public async createFromAudio(
        rawAudioPath: string,
        segment: AudioSegment,
        input: CreateTherapistInput,
    ): Promise<Therapist> {
        const fileInfo = await getInfoAsync(rawAudioPath);
        if (!fileInfo.exists) {
            throw new DevEncryptionException(`Audio file not found: ${rawAudioPath}`, 'AUDIO_FILE_MISSING');
        }

        if (!segment.isValid()) {
            throw new DevEncryptionException(
                `Invalid segment: start=${segment.startMs}ms, end=${segment.endMs}ms`,
                'INVALID_SEGMENT',
            );
        }

        const { therapist, artifacts } = this.therapistForge.create(input);

        this.logger.info('DevTherapistOnboarding: created therapist', {
            uuid: therapist.uuid,
            email: therapist.email,
        });

        const pcm = await this.segmentExtractor.extract(rawAudioPath, segment);
        this.logger.info('DevTherapistOnboarding: extracted segment', {
            startMs: segment.startMs,
            endMs: segment.endMs,
            samples: pcm.length,
        });

        const biocode = await this.voiceCalibrator.generateBiocode(artifacts.masterKey, pcm);
        therapist.setBiocode(biocode.projectedVector);

        const repo = this.registry.getRepository<TherapistRepository>(Therapist);
        await repo.persist(therapist);
        await this.vault.save(therapist.uuid, artifacts.masterKey);

        this.logger.info('DevTherapistOnboarding: persisted therapist with biocode', {
            uuid: therapist.uuid,
            biocodeLength: biocode.projectedVector.length,
            confidence: biocode.confidence,
        });

        return therapist;
    }
}

Container.register(
    DevTherapistOnboarding,
    () =>
        new DevTherapistOnboarding(
            Container.get(TherapistForge),
            Container.get(MasterKeyVault),
            Container.get(VoiceCalibrator),
            Container.get(DevAudioSegmentExtractor),
            Container.get(Registry),
            Container.get(AppLogger),
        ),
);
