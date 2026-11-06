import { AppLogger } from '@/Core/AppLogger';
import { Utterance } from '@/Entity';
import { PipelineTimings } from '../../src/Pipeline/PipelineTimings';
import { StreamTranscription } from '../../src/Pipeline/StreamTranscription';
import { SessionTranscribe } from '../../src/DevConsole/State/SessionTranscribe';
import type { StreamTranscriber } from '../../src/Pipeline/StreamTranscriber';
import type { StreamTranscriberFactory } from '../../src/Pipeline/StreamTranscriberFactory';

const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
} as unknown as AppLogger;

class FakeTranscriber {
    public transcribe = jest.fn(async (encryptedPath: string): Promise<StreamTranscription> => {
        return StreamTranscription.create(
            [new Utterance('utterance-1', 0, 1200, `transcribed:${encryptedPath}`, 'spk_dev', 1)],
            new PipelineTimings(),
        );
    });
}

class FakeFactory {
    public readonly create: jest.Mock;

    public constructor(public readonly transcriber: FakeTranscriber = new FakeTranscriber()) {
        this.create = jest.fn(async (): Promise<StreamTranscriber> => {
            return this.transcriber as unknown as StreamTranscriber;
        });
    }
}

function makeState(factory: StreamTranscriberFactory): SessionTranscribe {
    return new SessionTranscribe(factory, mockLogger);
}

describe('SessionTranscribe', () => {
    it('should default the dat path to the device fixtures directory', () => {
        const state = makeState(new FakeFactory() as unknown as StreamTranscriberFactory);

        expect(state.datPath$.get()).toContain('speech_thomas_16k.dat');
    });

    it('should transcribe the given encrypted path and expose utterances with elapsed time', async () => {
        const factory = new FakeFactory();
        const state = makeState(factory as unknown as StreamTranscriberFactory);

        await state.run('/fixtures/session.dat');

        expect(factory.create).toHaveBeenCalledTimes(1);
        expect(factory.transcriber.transcribe).toHaveBeenCalledWith('/fixtures/session.dat');

        const snapshot = state.state$.get();
        expect(snapshot.isLoading).toBe(false);
        expect(snapshot.error).toBeNull();
        expect(snapshot.elapsedMs).not.toBeNull();
        expect(snapshot.elapsedMs as number).toBeGreaterThanOrEqual(0);
        expect(snapshot.utterances).toHaveLength(1);
        expect(snapshot.utterances[0].text).toBe('transcribed:/fixtures/session.dat');
        expect(snapshot.timings).not.toBeNull();
        expect(snapshot.timings?.getTotalMs()).toBe(0);
    });

    it('should surface factory failures without leaving the state loading', async () => {
        const factory = new FakeFactory();
        factory.create.mockRejectedValueOnce(new Error('model load failed'));
        const state = makeState(factory as unknown as StreamTranscriberFactory);

        await state.run('/fixtures/session.dat');

        const snapshot = state.state$.get();
        expect(snapshot.isLoading).toBe(false);
        expect(snapshot.error).toBe('model load failed');
        expect(snapshot.utterances).toEqual([]);
    });

    it('should surface transcription failures without leaving the state loading', async () => {
        const factory = new FakeFactory();
        factory.transcriber.transcribe.mockRejectedValueOnce(new Error('decoder failure'));
        const state = makeState(factory as unknown as StreamTranscriberFactory);

        await state.run('/fixtures/session.dat');

        const snapshot = state.state$.get();
        expect(snapshot.isLoading).toBe(false);
        expect(snapshot.error).toBe('decoder failure');
        expect(snapshot.utterances).toEqual([]);
        expect(snapshot.timings).toBeNull();
    });
});
