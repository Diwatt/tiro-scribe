/**
 * Collection – Generic wrapper for entity arrays with conversion methods.
 * Inspired by Doctrine's ArrayCollection for type-safe collection operations.
 */

import type { Entity } from './Entity';

export class Collection<T> implements Iterable<T> {
    private readonly items: T[];

    /**
     * Create a new Collection from an array of items.
     */
    public constructor(items: T[] = []) {
        this.items = items;
    }

    /**
     * Get the number of items in the collection.
     */
    public get length(): number {
        return this.items.length;
    }

    /**
     * Check if the collection is empty.
     */
    public isEmpty(): boolean {
        return this.items.length === 0;
    }

    /**
     * Get the underlying array of items.
     */
    public toArray(): T[] {
        return [...this.items];
    }

    /**
     * Get the first item in the collection, or undefined if empty.
     */
    public first(): T | undefined {
        return this.items[0];
    }

    /**
     * Get the last item in the collection, or undefined if empty.
     */
    public last(): T | undefined {
        return this.items[this.items.length - 1];
    }

    /**
     * Map each item in the collection using a mapper function.
     */
    public map<U>(mapper: (item: T, index: number) => U): Collection<U> {
        return new Collection(this.items.map(mapper));
    }

    /**
     * Filter items in the collection using a predicate.
     */
    public filter(predicate: (item: T, index: number) => boolean): Collection<T> {
        return new Collection(this.items.filter(predicate));
    }

    /**
     * Convert collection items to DataObjects using a converter function.
     */
    public toDataObject<D>(converter: (item: T) => D): D[] {
        return this.items.map(converter);
    }

    /**
     * Convert collection items to DataObjects using each entity's toDataObject method.
     * This is a convenience method for collections of AbstractEntity.
     */
    public toDataObjects(): T extends Entity ? Record<string, unknown>[] : never {
        if (this.items.length === 0) {
            return [] as unknown as T extends Entity ? Record<string, unknown>[] : never;
        }
        // Check if first item has toDataObject method
        const first = this.items[0] as unknown;
        if (typeof (first as Record<string, unknown>).toDataObject !== 'function') {
            throw new Error('Collection items must have toDataObject method');
        }
        return this.items.map((item) => (item as unknown as Entity).toDataObject()) as T extends Entity ? Record<string, unknown>[] : never;
    }

    /**
     * Implement iterable interface for for...of loops.
     */
    public [Symbol.iterator](): Iterator<T> {
        return this.items[Symbol.iterator]();
    }

    /**
     * Create a Collection from an array (static factory).
     */
    public static from<T>(items: T[]): Collection<T> {
        return new Collection(items);
    }
}
