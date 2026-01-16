/**
 * Logger configuration for Tiro Scribe
 * 
 * Provides structured logging with different levels and environment-based configuration
 */

import {logger, consoleTransport} from 'react-native-logs';

const config = {
    severity: __DEV__ ? 'debug' : 'error',
    transport: consoleTransport,
    transportOptions: {
        colors: {
            info: 'blueBright',
            warn: 'yellowBright',
            error: 'redBright',
            debug: 'whiteBright',
        },
    },
    dateFormat: 'time',
    printLevel: true,
    printDate: true,
};

export const log = logger.createLogger(config);
