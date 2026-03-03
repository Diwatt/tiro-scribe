/**
 * Logger service - wrapper around react-native-logs
 *
 * Provides a consistent logging interface throughout the application.
 * This service wraps the Container.logger to provide the AppLogger interface
 * that tests and other components expect.
 */

import type { LoggerInterface } from '../Container';
import { Container } from '../Container';

/**
 * AppLogger - main logger interface used throughout the app
 */
export class AppLogger {
    private readonly logger: LoggerInterface;

    public constructor(logger?: LoggerInterface) {
        this.logger = logger || Container.logger;
    }

    public debug(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            this.logger.debug(message, meta);
        } else {
            this.logger.debug(message);
        }
    }

    public error(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            this.logger.error(message, meta);
        } else {
            this.logger.error(message);
        }
    }

    public info(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            this.logger.info(message, meta);
        } else {
            this.logger.info(message);
        }
    }

    public warn(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            this.logger.warn(message, meta);
        } else {
            this.logger.warn(message);
        }
    }
}

// Export a singleton instance for convenience
export const LOGGER = new AppLogger();
