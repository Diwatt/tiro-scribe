/**
 * Canonical list of status states used by Status components.
 *
 * Note: The previous helper that converted a `StatusState` into a theme key
 * has been removed. Theme mapping now lives in the theme module
 * (`src/theme/AppTheme.ts`) and should be the single source of truth for
 * mapping states -> themed `StatusColors`.
 */
export enum StatusState {
    Ready = 'ready',
    Processing = 'processing',
    BatchWaiting = 'batch_waiting',
    Setup = 'setup',
    Error = 'error',
    Warning = 'warning',
}