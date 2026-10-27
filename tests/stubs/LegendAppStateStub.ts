// Manual mock for @legendapp/state, resolved by jest.mock('@legendapp/state') in suites under tests/.
// TODO: point the suites at the real @legendapp/state and delete this mock.

import type { ObservableComputed } from '@legendapp/state';

export function observable<T>(initial: T): T {
    let value: any = initial;
    const listeners: Array<(arg: { value: T }) => void> = [];

    const makeSub = (key: keyof T) => {
        let subVal = (initial as any)?.[key];
        const subListeners: Array<(arg: { value: any }) => void> = [];
        return {
            get: () => subVal,
            set: (v: any) => {
                subVal = v;
                if (value && typeof value === 'object') {
                    (value as any)[key] = v;
                }
                subListeners.forEach((cb) => cb({ value: v }));
            },
            onChange: (cb: any) => {
                subListeners.push(cb);
                return { onChange: () => {} };
            },
        };
    };

    const proxy: any = {
        get: () => value,
        set: (v: T) => {
            value = v;
            listeners.forEach((cb) => cb({ value }));
        },
        onChange: (cb: any) => {
            listeners.push(cb);
            return { onChange: () => {} };
        },
    };

    if (initial && typeof initial === 'object') {
        for (const key of Object.keys(initial) as Array<keyof T>) {
            Object.defineProperty(proxy, key, {
                get: () => makeSub(key),
                enumerable: true,
                configurable: true,
            });
        }
    }

    return proxy as unknown as T;
}

export function computed<T>(fn: () => T): ObservableComputed<T> {
    return { get: fn } as unknown as ObservableComputed<T>;
}
