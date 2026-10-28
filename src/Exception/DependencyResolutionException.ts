/**
 * DependencyResolutionException - Thrown when the Container cannot resolve
 * a dependency because no factory was registered for the requested key.
 */

import { TiroScribeException } from './TiroScribeException';

export class DependencyResolutionException extends TiroScribeException {
    public constructor(message: string) {
        super(message, 'DEPENDENCY_RESOLUTION_FAILED');
        this.name = 'DependencyResolutionException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DependencyResolutionException);
        }
    }
}
