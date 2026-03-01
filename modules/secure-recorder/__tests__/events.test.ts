/**
 * Tests for SecureRecorder onerror callback (Pure Command pattern).
 * onerror is invoked when start/stop throws; it is not an event subscription.
 */

// Bypass root-level Jest mock for this module to test the real class
 
const { SecureRecorder } = jest.requireActual('../src/index');

// Helpers: minimal native/event emitter fakes for constructor-only tests
const createMinimalNative = () => {
    const listeners = new Map<string, Set<(d: any) => any>>();
    const ensure = (e: string) => {
        if (!listeners.has(e)) {
            listeners.set(e, new Set());
        }
        return listeners.get(e)!;
    };
    return {
        startRecording: jest.fn(async (_sessionId: string) => '/tmp/mock.dat'),
        stopRecording: jest.fn(async () => '/tmp/mock.dat'),
        getStatus: jest.fn(async () => ({ state: 'inactive', sessionId: null, filePath: null })),
        hasPermission: jest.fn(async () => true),
        stream: jest.fn(async (_p: string) => {}),
        addListener: jest.fn((event: string, listener: (d: any) => any) => {
            ensure(event).add(listener);
            return { remove: () => ensure(event).delete(listener) };
        }),
        removeAllListeners: jest.fn((_e?: string) => {}),
    };
};

const createRejectingStartNative = () => {
    const fake = createMinimalNative();
    (fake.startRecording as jest.Mock).mockImplementation(async () => {
        const err: any = { code: 'INITIALIZATION_FAILED', message: 'Mock start failed' };
        throw err;
    });
    return fake;
};

describe('SecureRecorder onerror', () => {
    describe('onerror property', () => {
        it('should have onerror property', () => {
            const fake = createMinimalNative();
            const recorder = new SecureRecorder('test-session', fake as any, fake as any);
            expect(recorder.onerror).toBeNull();
        });

        it('should allow setting onerror handler', () => {
            const fake = createMinimalNative();
            const recorder = new SecureRecorder('test-session', fake as any, fake as any);
            const handler = jest.fn();
            recorder.onerror = handler;
            expect(recorder.onerror).toBe(handler);
        });

        it('should allow removing onerror handler', () => {
            const fake = createMinimalNative();
            const recorder = new SecureRecorder('test-session', fake as any, fake as any);
            recorder.onerror = jest.fn();
            recorder.onerror = null;
            expect(recorder.onerror).toBeNull();
        });
    });

    describe('onerror when command throws', () => {
        it('should call onerror when start() throws', async () => {
            const fake = createRejectingStartNative();
            const recorder = new SecureRecorder('test-session', fake as any, fake as any);
            const errorHandler = jest.fn();
            recorder.onerror = errorHandler;

            await expect(recorder.start()).rejects.toMatchObject({ code: 'INITIALIZATION_FAILED' });

            expect(errorHandler).toHaveBeenCalled();
            const errorArg = errorHandler.mock.calls[0][0];
            expect(errorArg).toHaveProperty('code');
            expect(errorArg).toHaveProperty('message');
        });
    });

    describe('state updates and events with fake native module', () => {
        const createFakeNative = () => {
            let status = { state: 'inactive', sessionId: null, filePath: null } as any;
            const listeners = new Map<string, Set<(d: any) => any>>();
            const ensure = (e: string) => {
                if (!listeners.has(e)) {
                    listeners.set(e, new Set());
                }
                return listeners.get(e)!;
            };
            return {
                startRecording: jest.fn(async (sessionId: string) => {
                    status = { state: 'recording', sessionId, filePath: `/tmp/${sessionId}.dat` };
                    ensure('onRecordingStatusChanged').forEach((cb) => cb({ ...status }));
                    return status.filePath!;
                }),
                stopRecording: jest.fn(async () => {
                    status = { ...status, state: 'stopped' };
                    ensure('onRecordingStatusChanged').forEach((cb) => cb({ ...status }));
                    return status.filePath!;
                }),
                getStatus: jest.fn(async () => ({ ...status })),
                hasPermission: jest.fn(async () => true),
                stream: jest.fn(async (_p: string) => {}),
                addListener: jest.fn((event: string, listener: (d: any) => any) => {
                    ensure(event).add(listener);
                    return { remove: () => ensure(event).delete(listener) };
                }),
                removeAllListeners: jest.fn((_e?: string) => {}),
            };
        };

        it('should update state and fire onstatuschange on native status change', async () => {
            const fake = createFakeNative();
            const recorder = new SecureRecorder('s-1', fake as any, fake as any);
            // Wait for constructor _syncState to settle
            await Promise.resolve();

            const changes: any[] = [];
            recorder.onstatuschange = (e) => changes.push(e);

            await recorder.start();
            await Promise.resolve();
            expect(recorder.state).toBe('recording');
            expect(changes.at(-1)?.state).toBe('recording');

            await recorder.stop();
            await Promise.resolve();
            expect(recorder.state).toBe('stopped');
            expect(changes.at(-1)?.state).toBe('stopped');
        });

        it('should throw RECORDING_IN_PROGRESS when starting while already recording', async () => {
            const fake = createFakeNative();
            const recorder = new SecureRecorder('s-2', fake as any, fake as any);
            await Promise.resolve();

            await recorder.start();
            await Promise.resolve();
            await expect(recorder.start()).rejects.toMatchObject({ code: 'RECORDING_IN_PROGRESS' });
        });

        it('should throw RECORDER_STOPPED when starting after stopped', async () => {
            const fake = createFakeNative();
            const recorder = new SecureRecorder('s-3', fake as any, fake as any);
            await Promise.resolve();

            await recorder.start();
            await Promise.resolve();
            await recorder.stop();
            await Promise.resolve();

            await expect(recorder.start()).rejects.toMatchObject({ code: 'RECORDER_STOPPED' });
        });

        it('should throw NO_RECORDING_IN_PROGRESS when stopping while not recording', async () => {
            const fake = createFakeNative();
            const recorder = new SecureRecorder('s-4', fake as any, fake as any);

            await expect(recorder.stop()).rejects.toMatchObject({ code: 'NO_RECORDING_IN_PROGRESS' });
        });

        it('addDecryptionListener should subscribe and stream should delegate', async () => {
            const fake = createFakeNative();
            // Monkey-patch static module/decryption manager usage by passing fake as SecureRecorderModule
            // We can temporarily set addListener/stream on the actual module by using the class static methods
            // but simpler here: use the static methods expecting global module. We simulate by replacing methods.
            const { SecureRecorderModule } = jest.requireActual('../src/SecureRecorderModule');

            const originalAdd = SecureRecorderModule.addListener.bind(SecureRecorderModule);
            const originalStream = SecureRecorderModule.stream.bind(SecureRecorderModule);
            try {
                // Redirect to fake
                (SecureRecorderModule as any).addListener = fake.addListener;
                (SecureRecorderModule as any).stream = fake.stream;

                const handler = jest.fn();
                const sub = SecureRecorder.addDecryptionListener(handler);
                expect(fake.addListener).toHaveBeenCalledWith('onAudioChunkDecrypted', handler);
                expect(sub).toHaveProperty('remove');

                await SecureRecorder.stream('/tmp/file.dat');
                expect(fake.stream).toHaveBeenCalledWith('/tmp/file.dat');
            } finally {
                // Restore
                (SecureRecorderModule as any).addListener = originalAdd;
                (SecureRecorderModule as any).stream = originalStream;
            }
        });
    });
});

/**
 * Manual test steps (run on device/simulator)
 *
 * const recorder = new SecureRecorder('test-session');
 * recorder.onerror = (error) => console.error('Error:', error);
 *
 * await recorder.start();
 * // recorder.state === 'recording', recorder.filePath set
 *
 * const path = await recorder.stop();
 * // recorder.state === 'stopped', path is the encrypted file path
 */
