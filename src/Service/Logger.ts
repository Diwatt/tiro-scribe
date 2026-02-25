/**
 * Logger configuration for Tiro Scribe
 *
 * Provides structured logging with different levels and environment-based configuration
 */

import { consoleTransport, logger as reactNativeLogger } from 'react-native-logs';

/**
 * Logger instance type from react-native-logs
 */
type ReactNativeLogger = ReturnType<typeof reactNativeLogger.createLogger>;

/**
 * `appLogger` - shared logger instance for application logging
 *
 * Created once at module load time and reused across the entire app.
 */
// `appLogger` is created eagerly at module load. The configuration logic from
// the old `getInstance` method is preserved here, but callers no longer need to
// invoke a factory – they can simply import the constant and use it directly.
export const appLogger: ReactNativeLogger = reactNativeLogger.createLogger({
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


/**
 * Logger interface type for dependency injection
 * Extracted from the logger instance type
 */
export type LoggerInterface = typeof appLogger;
