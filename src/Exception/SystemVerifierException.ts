/**
 * SystemVerifierException - Exception for system verification errors
 *
 * Thrown when system requirements cannot be resolved or evaluated.
 */

import { TiroScribeException } from './TiroScribeException';

export class SystemVerifierException extends TiroScribeException {
    public static readonly CODE = 'SYSTEM_VERIFIER_ERROR';

    public static invalidPathFormat(path: string, expectedFormat: string): SystemVerifierException {
        return new SystemVerifierException(
            `Invalid path format: '${path}'. Expected format '${expectedFormat}'`,
            SystemVerifierException.CODE,
        );
    }

    public static unsupportedModule(moduleName: string): SystemVerifierException {
        return new SystemVerifierException(
            `Unsupported module in path: '${moduleName}'`,
            SystemVerifierException.CODE,
        );
    }

    public static missingProperty(propertyName: string, moduleName: string): SystemVerifierException {
        return new SystemVerifierException(
            `Missing property '${propertyName}' on module '${moduleName}'`,
            SystemVerifierException.CODE,
        );
    }

    public static methodInvocationFailed(path: string, cause: Error): SystemVerifierException {
        return new SystemVerifierException(
            `Failed to execute method at path ${path}: ${cause.message}`,
            SystemVerifierException.CODE,
            cause,
        );
    }

    public constructor(message: string, code: string, originalError?: Error) {
        super(message, code, originalError);
        this.name = 'SystemVerifierException';
    }
}