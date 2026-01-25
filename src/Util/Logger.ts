/**
 * Logger configuration for Tiro Scribe
 * 
 * Provides structured logging with different levels and environment-based configuration
 */

import {logger as reactNativeLogger, consoleTransport} from 'react-native-logs';

/**
 * Logger instance type from react-native-logs
 */
type ReactNativeLogger = ReturnType<typeof reactNativeLogger.createLogger>;

/**
 * AppLogger - Singleton factory class for application logging
 * 
 * Follows the standard singleton pattern with getInstance() method
 * Ensures a single logger instance is created and reused throughout the app
 */
export class AppLogger {
    private static instance: ReactNativeLogger | null = null;

    /**
     * Get the singleton logger instance
     * Creates the instance on first call, returns the same instance on subsequent calls
     */
    static getInstance(): ReactNativeLogger {
        if (!AppLogger.instance) {
            AppLogger.instance = reactNativeLogger.createLogger({
                severity: __DEV__ ? 'debug' : 'error',
                transport: consoleTransport,
                transportOptions: {
                    colors: {
                        info: 'blueBright',
                        warn: 'yellowBright',
                        error: 'redBright',
                        debug: 'whiteBright',
                    } as const,
                },
                dateFormat: 'time',
                printLevel: true,
                printDate: true,
            });
        }
        return AppLogger.instance;
    }
}

/**
 * Logger interface type for dependency injection
 * Extracted from the logger instance type
 */
export type LoggerInterface = ReactNativeLogger;
