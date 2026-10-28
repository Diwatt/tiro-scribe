import { InferenceModelDownloaderException } from '@/Exception';
import { SpeakerIdConfig } from '@/InferenceModel/Model/SpeakerIdConfig';

const CAMPLUS_YAML = `dataset_args:
  aug_prob: 0.6
  fbank_args:
    dither: 1.0
    frame_length: 25
    frame_shift: 10
    num_mel_bins: 80
  num_frms: 200
  resample_rate: 16000
  shuffle: true
model: CAMPPlus
model_args:
  embed_dim: 512
  feat_dim: 80
  pooling_func: TSTP
`;

describe('SpeakerIdConfig', () => {
    describe('fromYamlText', () => {
        it('parses the real 3D-Speaker CAM++ config fields', () => {
            const config = SpeakerIdConfig.fromYamlText(CAMPLUS_YAML);

            expect(config.embeddingDim).toBe(512);
            expect(config.numMelBins).toBe(80);
            expect(config.sampleRateHz).toBe(16000);
            expect(config.frameLengthMs).toBe(25);
            expect(config.frameShiftMs).toBe(10);
        });

        it('rejects a config missing the embedding dimension', () => {
            const missingEmbedDim = CAMPLUS_YAML.replace('  embed_dim: 512\n', '');

            expect(() => SpeakerIdConfig.fromYamlText(missingEmbedDim)).toThrow(InferenceModelDownloaderException);
            expect(() => SpeakerIdConfig.fromYamlText(missingEmbedDim)).toThrow(/model_args.embed_dim/);
        });

        it('rejects a config whose feature dim does not match the mel bins', () => {
            const incoherent = CAMPLUS_YAML.replace('  feat_dim: 80', '  feat_dim: 64');

            expect(() => SpeakerIdConfig.fromYamlText(incoherent)).toThrow(InferenceModelDownloaderException);
            expect(() => SpeakerIdConfig.fromYamlText(incoherent)).toThrow(/num_mel_bins/);
        });

        it('rejects input that is not valid YAML', () => {
            const garbage = 'model_args: [embed_dim: :: not: valid:';

            expect(() => SpeakerIdConfig.fromYamlText(garbage)).toThrow(InferenceModelDownloaderException);
            expect(() => SpeakerIdConfig.fromYamlText(garbage)).toThrow(/not valid YAML/);
        });
    });
});
