/**
 * AppLogger – central react-native-logs singleton with env-aware defaults.
 */

import { consoleTransport, logger as reactNativeLogger } from 'react-native-logs';
import type { AppConfig } from '@/Core/AppConfig';

export class AppLogger {
    private readonly logger: ReturnType<typeof reactNativeLogger.createLogger>;

    public constructor(config: AppConfig) {
        this.logger = reactNativeLogger.createLogger({
            severity: config.isDev ? 'debug' : 'error',
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

    // Proxy all logging methods
    public debug(message: string, ...args: unknown[]): void {
        this.logger.debug(message, ...args);
    }

    public info(message: string, ...args: unknown[]): void {
        this.logger.info(message, ...args);
    }

    public warn(message: string, ...args: unknown[]): void {
        this.logger.warn(message, ...args);
    }

    public error(message: string, ...args: unknown[]): void {
        this.logger.error(message, ...args);
    }

    // Proxy other LoggerInstance methods
    public extend(extension: string): ReturnType<typeof reactNativeLogger.createLogger> {
        return this.logger.extend(extension);
    }

    public enable(extension?: string): boolean {
        return this.logger.enable(extension);
    }

    public disable(extension?: string): boolean {
        return this.logger.disable(extension);
    }

    public getExtensions(): string[] {
        return this.logger.getExtensions();
    }

    public setSeverity(level: string): string {
        return this.logger.setSeverity(level);
    }

    public getSeverity(): string {
        return this.logger.getSeverity();
    }

    public patchConsole(): void {
        this.logger.patchConsole();
    }
}
