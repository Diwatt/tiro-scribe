import { LogMelSpectrogramOptions, MelFilterBankOptions, MelSpectrogramModule } from '@/InferenceModel/Spectrogram';

describe('MelSpectrogramModule', () => {
    let mockHybrid: { computeLogMelSpectrogram: jest.Mock; computeMelFilterBank: jest.Mock };

    jest.mock('mel-spectrogram', () => ({
        createMelSpectrogram: () => mockHybrid,
    }));

    it('forwards log-mel geometry and PCM bytes to the native hybrid object', async () => {
        mockHybrid = {
            computeLogMelSpectrogram: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
            computeMelFilterBank: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        };
        const module = new MelSpectrogramModule();
        const options = LogMelSpectrogramOptions.create(16000, 2, 10, 25, 0.97);

        await module.computeLogMelSpectrogram(options, new Uint8Array([1, 0, 0, 1]));

        expect(mockHybrid.computeLogMelSpectrogram).toHaveBeenCalledTimes(1);
        const [pcm16, sampleRateHz, bandCount, frameShiftMs, frameLengthMs, preemphCoeff] =
            mockHybrid.computeLogMelSpectrogram.mock.calls[0];
        expect(Array.from(new Uint8Array(pcm16))).toEqual([1, 0, 0, 1]);
        expect(sampleRateHz).toBe(16000);
        expect(bandCount).toBe(2);
        expect(frameShiftMs).toBe(10);
        expect(frameLengthMs).toBe(25);
        expect(preemphCoeff).toBe(0.97);
    });

    it('forwards filter-bank geometry with frame shift before frame length', async () => {
        mockHybrid = {
            computeLogMelSpectrogram: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
            computeMelFilterBank: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        };
        const module = new MelSpectrogramModule();
        const options = MelFilterBankOptions.create(16000, 4, 10, 25);

        await module.computeMelFilterBank(options, new Uint8Array([255, 255, 0, 2]));

        expect(mockHybrid.computeMelFilterBank).toHaveBeenCalledTimes(1);
        const [pcm16, sampleRateHz, bandCount, frameShiftMs, frameLengthMs] =
            mockHybrid.computeMelFilterBank.mock.calls[0];
        expect(Array.from(new Uint8Array(pcm16))).toEqual([255, 255, 0, 2]);
        expect(sampleRateHz).toBe(16000);
        expect(bandCount).toBe(4);
        expect(frameShiftMs).toBe(10);
        expect(frameLengthMs).toBe(25);
    });
});
