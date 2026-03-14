/**
 * UiYield – helpers for yielding to the UI / JS event loop.
 *
 * Used to allow pending state updates to render before starting heavier
 * synchronous work.
 */
export class EventLoop {
    /**
     * Yield to the next UI frame/idle cycle.
     *
     * Preference order:
     * 1. requestIdleCallback (when available)
     * 2. requestAnimationFrame
     * 3. setTimeout 0
     */
    public static yield(): Promise<void> {
        if (typeof requestIdleCallback === 'function') {
            return new Promise<void>((resolve) => requestIdleCallback(() => resolve()));
        }

        if (typeof requestAnimationFrame === 'function') {
            return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }

        return new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
}
