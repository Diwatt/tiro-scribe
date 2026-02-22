/**
 * Mock for expo/fetch module (JavaScript version).
 * This file exists because vitest.config.ts has an alias pointing here.
 */

import { vi } from 'vitest';

export const fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  })
);