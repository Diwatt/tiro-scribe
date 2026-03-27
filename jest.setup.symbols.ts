/**
 * Polyfills the Stage 3 decorator metadata symbol so that Jest/Vitest
 * test runners working in vanilla Node environments can reliably read
 * metadata produced by `emitDecoratorMetadata` and `@babel/plugin-proposal-decorators`
 * configured with the newer 2023-05 semantics.
 *
 * This file must be loaded before any user code that relies on decorator
 * metadata, so include it via Jest's `setupFiles`/`setupFilesAfterEnv` list.
 *
 * NOTE: This file also performs a very small, targeted suppression of a known
 * expo-modules-core console warning about EXPO_OS during initial module loads.
 * We temporarily filter that exact warning text while modules initialize so we
 * don't hide other warnings.
 */

// Set EXPO_OS environment variable before any modules load
// This prevents the warning from expo-modules-core
process.env.EXPO_OS = process.env.EXPO_OS || 'ios';

// Temporarily filter only the specific EXPO_OS warning emitted by expo-modules-core
// during initialization. We do this before any requires/imports so the suppression
// is active during initial module loads. We restore console.warn at the end.
const _originalConsoleWarn = console.warn;
console.warn = (...args) => {
  try {
    // Only suppress the specific message about EXPO_OS not being defined.
    // Keep all other warnings intact.
    if (typeof args[0] === 'string' && args[0].includes('The global process.env.EXPO_OS is not defined')) {
      return;
    }
  } catch {
    // In case of unexpected shapes, fall back to original
  }
  return _originalConsoleWarn.apply(console, args);
};

// Load reflect-metadata after we've installed the temporary warning filter.
require('reflect-metadata');

if (!Symbol.metadata) {
  const polyfillSymbol = Symbol.for('Symbol.metadata');
  Object.defineProperty(Symbol, 'metadata', {
    value: polyfillSymbol,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

// -----------------------------------------------------------------------------
// Expo winter runtime — force-evaluate lazy globals NOW (setupFiles phase)
//
// jest-expo@54's setup.js calls require('expo/src/winter'), which installs
// lazy property getters on `global` (e.g. __ExpoImportMetaRegistry) via
// installGlobal(). Each getter calls require() on first access.
//
// In jest@30, require() is only allowed while isInsideTestCode !== false.
// isInsideTestCode is set to false by leaveTestCode() after every hook/test.
// If any code path accesses these lazy getters *after* a test/hook completes,
// jest@30 throws "outside scope".
//
// Fix: trigger all lazy getters HERE, during setupFiles (isInsideTestCode ===
// undefined — the strict check `=== false` does NOT throw). Once evaluated,
// installGlobal replaces the getter with the concrete cached value, so
// subsequent accesses (with isInsideTestCode === false) just read the value
// and never call require() again.
// -----------------------------------------------------------------------------
const EXPO_LAZY_GLOBALS = [
  '__ExpoImportMetaRegistry',
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'URL',
  'URLSearchParams',
  'structuredClone',
] as const;

for (const key of EXPO_LAZY_GLOBALS) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(global, key);
    if (descriptor?.get) {
      // Accessing the property triggers the lazy getter, which calls require()
      // and then replaces itself with the concrete value.
      void (global as any)[key];
    }
  } catch (_) {
    // Ignore — the module may not exist in this environment
  }
}

// Restore console.warn to its original implementation now that initial module
// loading has completed. This prevents us from suppressing unrelated warnings
// later in test execution.
try {
  console.warn = _originalConsoleWarn;
} catch {
  // ignore if restoration fails for any reason
}

export {};
