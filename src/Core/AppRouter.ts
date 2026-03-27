import { type Href, router } from 'expo-router';
import type { AppLogger } from '@/Core/AppLogger';

export class AppRouter {
    public constructor(private readonly logger: AppLogger) {}

    public replace(path: string): void {
        try {
            router.replace(path as Href<string>);
        } catch (error) {
            this.logger.error(`[AppRouter] Failed to replace path: ${path}`, error);
        }
    }

    public push(path: string): void {
        try {
            router.push(path as Href<string>);
        } catch (error) {
            this.logger.error(`[AppRouter] Failed to push path: ${path}`, error);
        }
    }

    public back(): void {
        try {
            if (router.canGoBack()) {
                router.back();
            } else {
                this.logger.warn('[AppRouter] Cannot go back, history stack is empty.');
            }
        } catch (error) {
            this.logger.error('[AppRouter] Failed to go back', error);
        }
    }
}
