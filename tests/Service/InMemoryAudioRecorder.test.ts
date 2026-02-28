/**
 * InMemoryAudioRecorder tests.
 *
 * We exercise the public API by mocking the underlying react-native-nitro-sound module
 * and driving the event callbacks manually.  The suite follows the "ZOMBIES" methodology
 * used elsewhere in the repo: Zero, One, Many, Boundary, Interface, Exceptions.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { appLogger } from '@/Service/Logger';

// stub logger so constructor default works
vi.mock('@/Service/Logger', () => ({
    appLogger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

import { InMemoryAudioRecorder } from '../../src/Service/InMemoryAudioRecorder';
import * as NitroSound from 'react-native-nitro-sound';
import { InMemoryAudioRecorderException } from '@/Exception';

// mock react-native-nitro-sound fully, exposing helpers for tests
vi.mock('react-native-nitro-sound', () => {
    let lastRecordBackCallback: any = null;

    class MockSound {
        static lastInstance: any;

        constructor() {
            MockSound.lastInstance = this;
        }

        startRecorder = vi.fn(async () => 'mock-uri');
        stopRecorder = vi.fn(async () => 'mock-stopped-uri');
        addRecordBackListener = vi.fn((callback: Function) => {
            lastRecordBackCallback = callback;
        });
        removeRecordBackListener = vi.fn(() => {
            lastRecordBackCallback = null;
        });
        dispose = vi.fn(() => {});
    }

    return {
        createSound: vi.fn(() => new MockSound()),
        Sound: MockSound,
        __mockSoundClass: MockSound,
        __getLastRecordBackCallback: () => lastRecordBackCallback,
        __triggerRecordBack: (data: any) => lastRecordBackCallback?.(data),
    };
});

describe('InMemoryAudioRecorder', () => {
    let recorder: InMemoryAudioRecorder;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        // Create a fresh instance for each test to avoid shared state (isRecording, pendingCaptures)
        recorder = new InMemoryAudioRecorder(appLogger);
    });

    it('captures audio data and resolves when duration is reached', async () => {
        const durationMs = 1000; // 1 second
        const promise = recorder.capture(durationMs);

        const soundInstance = (NitroSound as any).__mockSoundClass.lastInstance;
        expect(soundInstance).toBeDefined();
        expect(soundInstance.startRecorder).toHaveBeenCalledWith(undefined, expect.any(Object));
        expect(soundInstance.addRecordBackListener).toHaveBeenCalled();

        // Simulate recording progress reaching duration
        const mockEventData = {
            currentPosition: durationMs,
            audioData: new Float32Array([1, 2, 3, 4, 5])
        };
        (NitroSound as any).__triggerRecordBack(mockEventData);

        const result = await promise;
        expect(result).toEqual(new Float32Array([1, 2, 3, 4, 5]));
        expect(soundInstance.removeRecordBackListener).toHaveBeenCalled();
        expect(soundInstance.dispose).toHaveBeenCalled();
    });

    it('rejects when startRecorder fails', async () => {
        const soundInstance = (NitroSound as any).__mockSoundClass.lastInstance;
        soundInstance.startRecorder.mockRejectedValueOnce(new Error('startRecorder failed'));
        
        await expect(recorder.capture(1000)).rejects.toThrow(InMemoryAudioRecorderException);
        await expect(recorder.capture(1000)).rejects.toThrow('startRecorder failed');
        // dispose is called in cleanupCapture which is in finally block
        expect(soundInstance.dispose).toHaveBeenCalled();
        // stopRecorder is called in cleanupCapture -> stopRecorderSafely
        expect(soundInstance.stopRecorder).toHaveBeenCalledTimes(1);
    });

    it('handles multiple concurrent capture attempts', async () => {
        // Start first capture
        const p1 = recorder.capture(1000);
        
        // Second capture should work
        const p2 = recorder.capture(1000);
        
        // Complete both captures
        const mockData = { currentPosition: 1000, audioData: new Float32Array([1, 2, 3]) };
        (NitroSound as any).__triggerRecordBack(mockData);
        
        await expect(p1).resolves.toEqual(new Float32Array([1, 2, 3]));
        await expect(p2).resolves.toEqual(new Float32Array([1, 2, 3]));
    });

    it('auto-stops recording after duration timeout', async () => {
        vi.useFakeTimers();
        const durationMs = 1000;
        
        const promise = recorder.capture(durationMs);
        
        const soundInstance = (NitroSound as any).__mockSoundClass.lastInstance;
        expect(soundInstance.startRecorder).toHaveBeenCalled();
        
        // Fast-forward time to trigger setTimeout (past duration, before safety margin)
        await vi.advanceTimersByTimeAsync(durationMs + 100);
        
        // Verify stopRecorder was called by timeout
        expect(soundInstance.stopRecorder).toHaveBeenCalled();
        
        // Complete the recording
        const mockData = { currentPosition: durationMs, audioData: new Float32Array([1, 2, 3]) };
        (NitroSound as any).__triggerRecordBack(mockData);
        
        await expect(promise).resolves.toEqual(new Float32Array([1, 2, 3]));
        
        vi.useRealTimers();
    });

    describe('configuration tests', () => {
        it('passes correct audio configuration to startRecorder', async () => {
            const promise = recorder.capture(1000);
            
            const soundInstance = (NitroSound as any).__mockSoundClass.lastInstance;
            const configCall = soundInstance.startRecorder.mock.calls[0];
            
            expect(configCall[0]).toBeUndefined(); // uri
            expect(configCall[1]).toMatchObject({
                AudioSamplingRate: 16000,
                AudioChannels: 1,
                AVEncodingOptionIOS: 'lpcm',
                AVLinearPCMBitDepthKeyIOS: 16,
                AVLinearPCMIsFloatKeyIOS: false,
                AudioSourceAndroid: 6,
            });
            
            // Complete the capture
            (NitroSound as any).__triggerRecordBack({ currentPosition: 1000, audioData: new Float32Array([1]) });
            await promise;
        });
    });

    describe('error handling', () => {
        it('handles recording errors gracefully', async () => {
            const soundInstance = (NitroSound as any).__mockSoundClass.lastInstance;
            soundInstance.startRecorder.mockRejectedValueOnce(new Error('Recording permission denied'));
            
            await expect(recorder.capture(1000)).rejects.toThrow(InMemoryAudioRecorderException);
        });

        it('always disposes sound instance even on error', async () => {
            const soundInstance = (NitroSound as any).__mockSoundClass.lastInstance;
            soundInstance.startRecorder.mockRejectedValueOnce(new Error('Test error'));
            
            await expect(recorder.capture(1000)).rejects.toThrow(InMemoryAudioRecorderException);
            expect(soundInstance.dispose).toHaveBeenCalled();
        });
    });
});
