/**
 * ArtifactRegistryException
 * Thrown when artifact fetch or verification fails.
 */

import { TiroScribeException } from './TiroScribeException';

export class ArtifactRegistryException extends TiroScribeException {
    constructor(message: string, originalError?: Error) {
        super(message, 'ARTIFACT_REGISTRY_ERROR', originalError);
        this.name = 'ArtifactRegistryException';
    }
}
