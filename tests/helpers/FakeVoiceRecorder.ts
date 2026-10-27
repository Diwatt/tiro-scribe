// Fake SecureRecorder for VoiceCalibrationRecorder tests: lifecycle methods are jest.fn()
// with the default behaviors the suite expects; pass an override to change one behavior.

import type { SecureRecorder } from 'secure-recorder';

type FakeVoiceRecorderOverrides = {
    initialize?: () => unknown;
    start?: () => unknown;
    stop?: () => unknown;
    dispose?: () => unknown;
};

export function createFakeRecorder(overrides: FakeVoiceRecorderOverrides = {}): SecureRecorder {
    const initialize = overrides.initialize ?? (() => Promise.resolve());
    const start = overrides.start ?? (() => Promise.resolve());
    const stop = overrides.stop ?? (() => Promise.resolve('/tmp/foo.enc'));
    const dispose = overrides.dispose ?? (() => undefined);

    return {
        initialize: jest.fn(initialize),
        start: jest.fn(start),
        stop: jest.fn(stop),
        dispose: jest.fn(dispose),
    } as unknown as SecureRecorder;
}
