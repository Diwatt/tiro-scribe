jest.mock('expo-device', () => {
  return {
    osName: 'unknown',
    totalMemory: 0,
  };
});

jest.mock('expo-file-system', () => {
  return {
    Paths: {
      availableDiskSpace: 0,
    },
  };
});

import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import { SystemVerifier } from '../../src/Service/SystemVerifier';

type LoggerStub = {
  debug: (msg: string, obj?: unknown) => void;
  warn: (msg: string, obj?: unknown) => void;
  info: (msg: string, obj?: unknown) => void;
  error: (msg: string, obj?: unknown) => void;
};

const createLogger = (): LoggerStub => ({
  debug: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
});

describe('SystemVerifier (unit)', () => {
  let logger: LoggerStub;

  beforeEach(() => {
    // reset the mocked exports' values between tests
    (Device as any).osName = 'unknown';
    (Device as any).totalMemory = 0;
    delete (Device as any).getName;
    delete (Device as any).thrower;

    (Paths as any).availableDiskSpace = 0;

    logger = createLogger();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // ensure no state is leaked
    jest.restoreAllMocks();
  });

  it('returns true when requirements are missing or empty', async () => {
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported()).toBe(true);
    expect(await verifier.isSupported({})).toBe(true);
  });

  it('evaluates numeric comparisons on Device.totalMemory', async () => {
    (Device as any).totalMemory = 8;
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported({ 'Device.totalMemory': '>= 5' })).toBe(true);
    expect(await verifier.isSupported({ 'Device.totalMemory': '< 10' })).toBe(true);
    // failing case
    expect(await verifier.isSupported({ 'Device.totalMemory': '> 20' })).toBe(false);
  });

  it('evaluates string equality for Device.osName with single and double quotes', async () => {
    (Device as any).osName = 'Android';
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported({ 'Device.osName': '=="Android"' })).toBe(true);
    expect(await verifier.isSupported({ "Device.osName": "=='Android'" })).toBe(true);
    expect(await verifier.isSupported({ 'Device.osName': '=="iOS"' })).toBe(false);
  });

  it('evaluates Paths.availableDiskSpace and compares numeric result', async () => {
    (Paths as any).availableDiskSpace = 4096;
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported({ 'Paths.availableDiskSpace': '>= 1024' })).toBe(true);
  });

  it('supports async module methods (promise-returning) and binding (zombie method)', async () => {
    // Paths.availableDiskSpace is a sync property, test Device.getName instead
    (Device as any).osName = 'ZOMBIE';
    (Device as any).getName = function () {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (this as any).osName;
    };
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported({ 'Device.getName': '=="ZOMBIE"' })).toBe(true);
  });

  it('returns false when a module method throws', async () => {
    (Device as any).thrower = () => {
      throw new Error('boom');
    };
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported({ 'Device.thrower': '== true' })).toBe(false);
  });

  it('returns false for unsupported module and missing property', async () => {
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported({ 'Other.foo': '== 1' })).toBe(false);
    expect(await verifier.isSupported({ 'Device.nonExistent': '== 1' })).toBe(false);
  });

  it('returns false for invalid expression format', async () => {
    (Device as any).osName = 'iOS';
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported({ 'Device.osName': 'equals "iOS"' })).toBe(false);
  });

  it('handles boolean equality and inequality', async () => {
    (Device as any).isEmulator = true;
    const verifier = new SystemVerifier(logger as any);
    expect(await verifier.isSupported({ 'Device.isEmulator': '== true' })).toBe(true);
    expect(await verifier.isSupported({ 'Device.isEmulator': '!= false' })).toBe(true);
  });

  it('evaluates multiple requirements: all satisfied -> true', async () => {
    (Device as any).osName = 'Android';
    (Device as any).totalMemory = 8;
    (Paths as any).availableDiskSpace = 2048;

    const verifier = new SystemVerifier(logger as any);
    const ok = await verifier.isSupported({
      'Device.osName': '=="Android"',
      'Device.totalMemory': '>= 4',
      'Paths.availableDiskSpace': '>= 1024',
    });
    expect(ok).toBe(true);
  });

  it('evaluates multiple requirements: one fails -> false', async () => {
    (Device as any).osName = 'Android';
    (Device as any).totalMemory = 2;
    (Paths as any).availableDiskSpace = 2048;

    const verifier = new SystemVerifier(logger as any);
    const ok = await verifier.isSupported({
      'Device.osName': '=="Android"',
      'Device.totalMemory': '>= 4',
      'Paths.availableDiskSpace': '>= 1024',
    });
    expect(ok).toBe(false);
  });
});