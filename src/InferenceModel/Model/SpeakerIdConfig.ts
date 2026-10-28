/**
 * SpeakerIdConfig – Validated CAM++ inference parameters parsed from the
 * config.yaml (3D-Speaker training config) shipped with the model bundle.
 */

import { load } from 'js-yaml';
import { z } from 'zod';
import { InferenceModelDownloaderException } from '@/Exception';

export class SpeakerIdConfig {
    public static readonly yamlSchema = z
        .object({
            model_args: z.object({
                embed_dim: z.number().int().positive(),
                feat_dim: z.number().int().positive(),
            }),
            dataset_args: z.object({
                resample_rate: z.number().int().positive(),
                fbank_args: z.object({
                    num_mel_bins: z.number().int().positive(),
                    frame_length: z.number().positive(),
                    frame_shift: z.number().positive(),
                }),
            }),
        })
        .refine((data) => data.model_args.feat_dim === data.dataset_args.fbank_args.num_mel_bins, {
            message: 'model_args.feat_dim must match dataset_args.fbank_args.num_mel_bins',
        });

    public constructor(
        public readonly embeddingDim: number,
        public readonly numMelBins: number,
        public readonly sampleRateHz: number,
        public readonly frameLengthMs: number,
        public readonly frameShiftMs: number,
    ) {}

    public static fromYamlText(text: string): SpeakerIdConfig {
        let raw: unknown;
        try {
            raw = load(text);
        } catch (error) {
            throw new InferenceModelDownloaderException(
                `CAM++ config.yaml is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
            );
        }

        const parsed = SpeakerIdConfig.yamlSchema.safeParse(raw);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            throw new InferenceModelDownloaderException(
                `CAM++ config.yaml is missing expected model parameters: ${issues}`,
            );
        }

        return new SpeakerIdConfig(
            parsed.data.model_args.embed_dim,
            parsed.data.dataset_args.fbank_args.num_mel_bins,
            parsed.data.dataset_args.resample_rate,
            parsed.data.dataset_args.fbank_args.frame_length,
            parsed.data.dataset_args.fbank_args.frame_shift,
        );
    }
}
