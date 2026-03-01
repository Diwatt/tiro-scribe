/**
 * Simple minimal async FIFO used throughout the codebase when a lightweight
 * queue with async consumption is required.  It intentionally lives in the
 * `Util` folder to avoid a generic "utils" smorgasbord; the implementation is
 * small enough to understand at a glance and has no external dependencies.
 *
 * It mirrors the API of Node's `AsyncQueue`/`Deque` but only supports what our
 * callers need: a pushable queue, async dequeue, and an async iterator.
 */
export class AsyncQueue<T> {
    private readonly items: T[] = [];
    private waiter?: () => void;

    public async dequeue(): Promise<T> {
        while (this.items.length === 0) {
            await new Promise<void>((r) => (this.waiter = r));
        }
        const item = this.items.shift();
        if (item === undefined) {
            throw new Error('Queue is empty');
        }
        return item;
    }

    public enqueue(item: T): void {
        this.items.push(item);
        if (this.waiter) {
            const r = this.waiter;
            this.waiter = undefined;
            r();
        }
    }

    /**
     * Async iterator implementation so callers can `for await` over the queue
     * without writing their own loop.
     */
    public async *[Symbol.asyncIterator](): AsyncGenerator<T, void, unknown> {
        while (true) {
            yield await this.dequeue();
        }
    }
}
