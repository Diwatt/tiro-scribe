/**
 * VadConfig – Validated Silero VAD v5 inference parameters parsed from the
 * config.yaml shipped with the model bundle.
 */

import { load } from 'js-yaml';
import { z } from 'zod';
import { InferenceModelDownloaderException } from '@/Exception';

export class VadConfig {
    public static readonly yamlSchema = z
        .object({
            vad_args: z.object({
                sample_rate: z.number().int().refine((value) => value === 8000 || value === 16000, {
                    message: 'sample_rate must be 8000 or 16000',
                }),
                window_samples: z.number().int().positive(),
                context_samples: z.number().int().nonnegative(),
                hidden_size: z.number().int().positive(),
            }),
        })
        .refine((data) => data.vad_args.window_samples % 64 === 0, {
            message: 'window_samples must be a multiple of 64 (Silero v5 constraint)',
        });

    public constructor(
        public readonly sampleRateHz: number,
        public readonly windowSamples: number,
        public readonly contextSamples: number,
        public readonly hiddenSize: number,
    ) {}

    public static fromYamlText(text: string): VadConfig {
        let raw: unknown;
        try {
            raw = load(text);
        } catch (error) {
            throw new InferenceModelDownloaderException(
                `Silero VAD config.yaml is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
            );
        }

        const parsed = VadConfig.yamlSchema.safeParse(raw);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            throw new InferenceModelDownloaderException(
                `Silero VAD config.yaml is missing expected model parameters: ${issues}`,
            );
        }

        return new VadConfig(
            parsed.data.vad_args.sample_rate,
            parsed.data.vad_args.window_samples,
            parsed.data.vad_args.context_samples,
            parsed.data.vad_args.hidden_size,
        );
    }
}
