import { Container } from '../../src/Core/Container';
import { SpectrogramBench } from '../../src/DevConsole/State/SpectrogramBench';
import { SpectrogramBenchId } from '../../src/DevConsole/Data/SpectrogramBenchEntry';
import { SourceIngestException } from '../../src/DevConsole/Ingest/SourceIngestException';
import { AppLogger } from '../../src/Core/AppLogger';

describe('SpectrogramBench', () => {
    const MEL_AUDIO_SECONDS = 1;
    const FBANK_AUDIO_SECONDS = 1;

    const createBench = (): SpectrogramBench =>
        new SpectrogramBench(Container.get(AppLogger), MEL_AUDIO_SECONDS, FBANK_AUDIO_SECONDS);

    it('runs both front-end benches and produces one entry per front-end', async () => {
        const bench = createBench();

        await bench.run();

        const entries = bench.snapshot.entries;
        expect(entries).toHaveLength(2);
        expect(entries.map((entry) => entry.id)).toEqual([SpectrogramBenchId.Mel128, SpectrogramBenchId.Fbank80]);
    });

    it('reports the injected audio seconds per entry', async () => {
        const bench = createBench();

        await bench.run();

        for (const entry of bench.snapshot.entries) {
            expect(entry.audioSeconds).toBe(MEL_AUDIO_SECONDS);
            break;
        }
        expect(bench.snapshot.entries[1].audioSeconds).toBe(FBANK_AUDIO_SECONDS);
    });

    it('reports a positive duration consistent with the real-time factor', async () => {
        const bench = createBench();

        await bench.run();

        for (const entry of bench.snapshot.entries) {
            expect(entry.durationMs).toBeGreaterThan(0);
            expect(entry.realTimeFactor).toBeCloseTo(entry.durationMs / (entry.audioSeconds * 1000), 10);
        }
    });

    it('clears the loading flag when the run completes', async () => {
        const bench = createBench();

        await bench.run();

        expect(bench.isLoading).toBe(false);
    });

    it('reports a failure in the snapshot error when a bench throws', async () => {
        const bench = new SpectrogramBench(Container.get(AppLogger), MEL_AUDIO_SECONDS, -1);

        await expect(bench.run()).rejects.toThrow(SourceIngestException);

        expect(bench.snapshot.error).toContain('audio seconds');
        expect(bench.isLoading).toBe(false);
    });

    it('keeps the audio signal at unit test scale under 1 s of synthesized audio', () => {
        const bench = createBench();
        const signal = bench.synthesizeToneForSeconds(MEL_AUDIO_SECONDS);

        expect(signal.length).toBe(Math.floor(MEL_AUDIO_SECONDS * SpectrogramBench.SAMPLE_RATE_HZ));
    });
});
