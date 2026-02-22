/**
 * Expo platform mocks for testing.
 * These mocks are used across multiple test files.
 */

import { vi } from 'vitest';

export const mockExpoCrypto = {
    getRandomBytes: vi.fn((n: number) => new Uint8Array(n).fill(0)),
    getRandomValues: vi.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    }),
};

export const mockExpoSecureStore = {
    getItemAsync: vi.fn(() => Promise.resolve(null)),
    setItemAsync: vi.fn(() => Promise.resolve()),
    deleteItemAsync: vi.fn(() => Promise.resolve()),
};

export const mockExpoFileSystem = {
    documentDirectory: 'file:///test-documents/',
    getInfoAsync: vi.fn(() => Promise.resolve({ exists: true, uri: 'file:///test' })),
    readAsStringAsync: vi.fn(() => Promise.resolve('')),
    writeAsStringAsync: vi.fn(() => Promise.resolve()),
    deleteAsync: vi.fn(() => Promise.resolve()),
    makeDirectoryAsync: vi.fn(() => Promise.resolve()),
};

export const mockExpoFetch = {
    fetch: vi.fn(() =>
        Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        }),
    ),
};