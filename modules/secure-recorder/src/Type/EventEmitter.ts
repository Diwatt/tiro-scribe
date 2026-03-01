/**
 * Interface for event emitter operations.
 * Enables dependency inversion and testability.
 */
export interface EventEmitter {
    addListener<TEventPayload = unknown>(
        event: string,
        listener: (data: TEventPayload) => void,
    ): { remove: () => void };
}
