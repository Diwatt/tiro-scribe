/**
 * Timer – small utility for time-related helpers.
 *
 * The only method currently provided is a `sleep` helper which returns a
 * promise that resolves after a given number of milliseconds.  This avoids
 * repeatedly writing the `new Promise(setTimeout)` boilerplate across the
 * codebase.
 *
 * Usage:
 * ```ts
 * await Timer.sleep(5000);
 * ```
 */
export class Timer {
    /**
     * Resolve after the specified duration.
     */
    public static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
