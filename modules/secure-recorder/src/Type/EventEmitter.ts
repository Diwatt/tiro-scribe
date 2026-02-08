/**
 * Interface for event emitter operations.
 * Enables dependency inversion and testability.
 */
export interface EventEmitter {
    addListener(event: string, listener: (data: any) => any): { remove: () => void };
}
