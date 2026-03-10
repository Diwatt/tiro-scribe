/**
 * ErrorMessage – utilities for producing readable string representations of
 * `unknown` error values.  Many parts of the app deal with `catch (e: unknown)`
 * and need a consistent fallback when the value isn't a proper `Error`.
 *
 * This is deliberately a simple `class` with a static method so callers can
 * import it without instantiating anything (following the pattern used by
 * other helpers in `src/Util`).
 */
export class ErrorMessage {
    /**
     * Return a human‑readable message for an arbitrary value thrown/caught.
     *
     * - If the value is an instance of `Error` we return `error.message`.
     * - If it's a string we return it directly (some libraries throw strings).
     * - Otherwise we attempt `JSON.stringify` and fall back to `String`.
     */
    public static toString(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'string') {
            return error;
        }

        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
}
