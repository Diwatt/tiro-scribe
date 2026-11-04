/**
 * PitchConfig – Validated CREPE pitch inference parameters parsed from the
 * config.yaml shipped with the model bundle.
 */

import { load } from 'js-yaml';
import { z } from 'zod';
import { InferenceModelDownloaderException } from '@/Exception';

export class PitchConfig {
    public static readonly yamlSchema = z
        .object({
            pitch_args: z.object({
                sample_rate: z.number().int().positive(),
                frame_samples: z.number().int().positive(),
                pitch_bins: z.number().int().positive(),
                cents_per_bin: z.number().positive(),
                min_frequency_hz: z.number().positive(),
                voiced_threshold: z.number().min(0).max(1),
            }),
        })
        .refine((data) => data.pitch_args.frame_samples > data.pitch_args.min_frequency_hz, {
            message: 'frame_samples must exceed min_frequency_hz for a meaningful analysis window',
        });

    public constructor(
        public readonly sampleRateHz: number,
        public readonly frameSamples: number,
        public readonly pitchBins: number,
        public readonly centsPerBin: number,
        public readonly minFrequencyHz: number,
        public readonly voicedThreshold: number,
    ) {}

    public static fromYamlText(text: string): PitchConfig {
        let raw: unknown;
        try {
            raw = load(text);
        } catch (error) {
            throw new InferenceModelDownloaderException(
                `CREPE config.yaml is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
            );
        }

        const parsed = PitchConfig.yamlSchema.safeParse(raw);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            throw new InferenceModelDownloaderException(
                `CREPE config.yaml is missing expected model parameters: ${issues}`,
            );
        }

        return new PitchConfig(
            parsed.data.pitch_args.sample_rate,
            parsed.data.pitch_args.frame_samples,
            parsed.data.pitch_args.pitch_bins,
            parsed.data.pitch_args.cents_per_bin,
            parsed.data.pitch_args.min_frequency_hz,
            parsed.data.pitch_args.voiced_threshold,
        );
    }
}
