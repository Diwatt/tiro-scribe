/**
 * Database configuration: Legend-State + MMKV persistence.
 * Exports the Registry singleton for centralized data access.
 */

import { configureObservablePersistence } from '@legendapp/state/persist';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { registry } from './Registry';

configureObservablePersistence({
    pluginLocal: ObservablePersistMMKV,
});

export { registry };
export type { EntityConstructor } from './AbstractEntity';
export { AbstractEntity } from './AbstractEntity';
export { Repository } from './Repository';
